import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
import {
  get_active_courses,
  get_current_grades,
  get_upcoming_assignments,
  get_all_upcoming_assignments,
  get_user_profile,
  get_assignment_details
} from '@/lib/canvas-tools'

const openai = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key',
})

// ── Service-role Supabase client (Lazy loaded to prevent build crashes) ───────
let _supabaseService: any = null
function getSupabaseService() {
  if (_supabaseService) return _supabaseService
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('Logging skipped: Supabase Service Role credentials missing.')
    return null
  }
  _supabaseService = createServiceClient(url, key)
  return _supabaseService
}

// ── Error Logger ─────────────────────────────────────────────────────────────
function classifyError(err: any): { error_type: string; problem_identifier: string } {
  const msg = String(err?.message || err || '')
  const status = err?.status ?? err?.statusCode

  if (status === 429 || msg.includes('429')) return {
    error_type: 'rate_limit',
    problem_identifier: 'AI engine rate limited — too many requests sent in a short period. Consider adding request throttling.'
  }
  if (status === 401 || msg.includes('401') || msg.includes('UNAUTHORIZED')) return {
    error_type: 'canvas_auth',
    problem_identifier: "User's Canvas API key is invalid or expired. They need to update it in Settings."
  }
  if (msg.includes('canvas') || msg.includes('Canvas')) return {
    error_type: 'canvas_api',
    problem_identifier: `Canvas API call failed: ${msg.slice(0, 120)}`
  }
  if (msg.includes('cerebras') || msg.includes('openai') || msg.includes('stream')) return {
    error_type: 'ai_engine',
    problem_identifier: `AI engine (Cerebras) error: ${msg.slice(0, 120)}`
  }
  if (msg.includes('supabase') || msg.includes('postgres')) return {
    error_type: 'database',
    problem_identifier: `Database error: ${msg.slice(0, 120)}`
  }
  if (msg.includes('timeout') || msg.includes('AbortError')) return {
    error_type: 'timeout',
    problem_identifier: 'Request timed out — the AI took longer than the allowed window to respond.'
  }
  return {
    error_type: 'unknown',
    problem_identifier: `Unclassified error: ${msg.slice(0, 180)}`
  }
}

async function logError(opts: {
  userId?: string
  userPrompt?: string
  agentResponse?: string
  err: any
  context?: Record<string, any>
}) {
  try {
    const service = getSupabaseService()
    if (!service) return

    const { error_type, problem_identifier } = classifyError(opts.err)
    await service.from('error_logs').insert({
      user_id: opts.userId ?? null,
      user_prompt: opts.userPrompt ?? null,
      agent_response: opts.agent_response ?? null,
      error_type,
      error_message: String(opts.err?.message ?? opts.err ?? '').slice(0, 2000),
      problem_identifier,
      context: opts.context ?? null
    })
  } catch (logErr) {
    console.error('Failed to write error log:', logErr)
  }
}

/** Remove any <tool_call>...</tool_call> XML that Qwen sometimes emits inline */
function stripToolCallXml(content: string | null | undefined): string {
  if (!content) return ''
  return content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').replace(/<tool_response>[\s\S]*?<\/tool_response>/g, '').trim()
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_assignment_details',
      description: 'Get deep details about 1 specific assignment including its description, allowed file types, and more. Use this when the user asks "What is this assignment about?" or needs details on a specific ID.',
      parameters: {
        type: 'object',
        properties: {
          course_id: { type: 'string', description: 'The numeric numeric course ID (found in context or via get_active_courses)' },
          assignment_id: { type: 'string', description: 'The numeric assignment ID' },
        },
        required: ['course_id', 'assignment_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_active_courses',
      description: 'Fetch the users active courses from Canvas.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_grades',
      description: 'Fetch the users current grades for a specific course from Canvas.',
      parameters: {
        type: 'object',
        properties: {
          course_id: { type: 'string' }
        },
        required: ['course_id']
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_assignments',
      description: 'Fetch upcoming assignments for a specific course.',
      parameters: {
        type: 'object',
        properties: {
          course_id: { type: 'string' }
        },
        required: ['course_id']
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_upcoming_assignments',
      description: 'Fetch ALL upcoming assignments across ALL of the user\'s courses in one call. Use this whenever the user asks about their schedule, upcoming deadlines, what is due soon, or due this/next week.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'post_discussion_reply',
      description: 'Post a reply to a Canvas discussion. Requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          course_id: { type: 'string' },
          discussion_id: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['course_id', 'discussion_id', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_missing_tool',
      description: 'Log that a user requested a Canvas feature or data we cannot currently access.',
      parameters: {
        type: 'object',
        properties: {
          requested_feature: { type: 'string', description: 'Description of what the user wanted to do' },
        },
        required: ['requested_feature'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_user_memory',
      description: 'Save a learned fact or preference about the user (e.g. "User is an Econ major", "User prefers studying at night") to provide personalized responses in the future.',
      parameters: {
        type: 'object',
        properties: {
          preference_text: { type: 'string', description: 'The fact or preference to remember' },
        },
        required: ['preference_text'],
      },
    },
  },
]

export async function POST(req: Request) {
  let user: any = null
  let lastUserPrompt = ''

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { messages: incomingMessages, pendingToolCall, toolResult, chatId } = body

    if (!process.env.CEREBRAS_API_KEY) {
      return NextResponse.json({ error: 'CEREBRAS_API_KEY is missing!' }, { status: 500 })
    }

    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!userData?.encrypted_canvas_key) return NextResponse.json({ error: 'Canvas key missing' }, { status: 400 })

    const canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)

    // Parallel Hydration + Memories
    const [memories, _] = await Promise.all([
      supabase.from('user_memories').select('memory_text').eq('user_id', user.id),
      (!userData.canvas_cache || !userData.name) ? (async () => {
        try {
          const [c, p] = await Promise.all([get_active_courses(canvasKey), get_user_profile(canvasKey)])
          await supabase.from('users').update({
            canvas_cache: c,
            name: p.short_name || p.name,
            avatar_url: p.avatar_url
          }).eq('id', user.id)
        } catch { }
      })() : Promise.resolve()
    ])

    // History
    let history: any[] = []
    if (chatId) {
      const { data: cd } = await supabase.from('chats').select('messages').eq('id', chatId).single()
      history = cd?.messages || []
    }
    if (incomingMessages?.length) {
      const nm = incomingMessages[incomingMessages.length - 1]
      if (nm.role === 'user') { history.push(nm); lastUserPrompt = nm.content || ''; }
    }
    if (toolResult && pendingToolCall) { history.push(pendingToolCall); history.push(toolResult); }

    const activeChatId = await saveHistory(supabase, user.id, history, chatId)

    // THE STREAMING RESPONSE
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const send = (txt: string) => controller.enqueue(encoder.encode(txt))

        try {
          // Pulse immediate feedback to keep Vercel alive
          send("Thinking...")

          // Greedy Fetch (Parallel with initial model call if possible)
          const isAcademic = /grade|assignment|due|upcoming|exam|test|quiz|econ|syllabus/.test(lastUserPrompt.toLowerCase())
          const preFetched = isAcademic ? await get_all_upcoming_assignments(canvasKey, userData.canvas_cache) : null

          if (preFetched) send("\n(Accessed Canvas schedule)")

          let systemPrompt = `You are the "Ask Canvas" Assistant.
[CONTEXT]
Name: ${userData.name || "Student"}
Courses: ${JSON.stringify(userData.canvas_cache || [])}
Pre-fetched Assignments: ${JSON.stringify(preFetched || [])}
Memories: ${memories.data?.map(m => m.memory_text).join('; ') || 'None'}
[RULES]
- Use Markdown.
- If pre-fetched assignments exist, answer IMMEDIATELY without tools.
- If data is missing, use tools.`

          let currentHistory = [...history.slice(-10)]
          let iterations = 0
          let assembled = ''
          let loopFinished = false

          while (iterations < 5 && !loopFinished) {
            iterations++

            const completion = await openai.chat.completions.create({
              model: 'qwen-3-235b-a22b-instruct-2507',
              messages: [{ role: 'system', content: systemPrompt }, ...currentHistory],
              tools: tools as any,
              tool_choice: 'auto'
            })

            const msg = completion.choices[0].message as any

            if (msg.tool_calls?.length) {
              send("\n(Processing Canvas data...)")

              const results = await Promise.all(msg.tool_calls.map(async (tc: any) => {
                const name = tc.function.name
                const args = JSON.parse(tc.function.arguments || '{}')
                let res = ''
                try {
                  if (name === 'get_all_upcoming_assignments') res = JSON.stringify(await get_all_upcoming_assignments(canvasKey, userData.canvas_cache))
                  else if (name === 'get_active_courses') res = JSON.stringify(await get_active_courses(canvasKey))
                  else if (name === 'get_current_grades') res = JSON.stringify(await get_current_grades(canvasKey, args.course_id))
                  else if (name === 'get_upcoming_assignments') res = JSON.stringify(await get_upcoming_assignments(canvasKey, args.course_id))
                  else res = "Tool not found"
                } catch { res = "Error accessing Canvas" }
                return { role: 'tool', tool_call_id: tc.id, name, content: res }
              }))

              currentHistory.push(msg)
              results.forEach(r => currentHistory.push(r))
            } else {
              // Final Text turn - switch to REAL streaming for the finish
              loopFinished = true

              const finalStream = await openai.chat.completions.create({
                model: 'qwen-3-235b-a22b-instruct-2507',
                stream: true,
                messages: [{ role: 'system', content: systemPrompt }, ...currentHistory]
              })

              // Clear the "Thinking..." pulse before final output
              // Note: We can't really "delete" tokens already sent, so we shift to a new paragraph
              send("\n\n---\n\n")

              for await (const chunk of finalStream) {
                const token = chunk.choices[0]?.delta?.content ?? ''
                if (token) {
                  assembled += token
                  send(token)
                }
              }
            }
          }

          // Persist history
          history.push({ role: 'assistant', content: assembled })
          await saveHistory(supabase, user.id, history, activeChatId)

        } catch (err: any) {
          console.error(err)
          send(`\n\n[Error]: ${err.message}`)
          await logError({ userId: user?.id, userPrompt: lastUserPrompt, err })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function saveHistory(supabase: any, userId: string, history: any[], chatId?: string) {
  if (chatId) {
    await supabase.from('chats').update({ messages: history, updated_at: new Date().toISOString() }).eq('id', chatId)
    return chatId
  } else {
    const { data } = await supabase.from('chats').insert({ user_id: userId, messages: history }).select('id').single()
    return data?.id
  }
}
