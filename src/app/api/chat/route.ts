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
  get_all_grades,
  get_upcoming_assignments,
  get_all_upcoming_assignments,
  get_user_profile,
  get_assignment_details
} from '@/lib/canvas-tools'

const openai = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key',
})

// ── Service-role Supabase client ──────────────────────────────────────────────
let _supabaseService: any = null
function getSupabaseService() {
  if (_supabaseService) return _supabaseService
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _supabaseService = createServiceClient(url, key)
  return _supabaseService
}

async function logError(opts: { userId?: string, userPrompt?: string, agentResponse?: string, err: any }) {
  try {
    const service = getSupabaseService()
    if (!service) return
    await service.from('error_logs').insert({
      user_id: opts.userId ?? null,
      user_prompt: opts.userPrompt ?? null,
      agent_response: opts.agentResponse ?? null,
      error_type: 'runtime_error',
      error_message: String(opts.err?.message ?? opts.err ?? '').slice(0, 2000),
      problem_identifier: 'Runtime error categorized by system logger.'
    })
  } catch { }
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_all_grades',
      description: 'Fetch grades for ALL active courses in one single call.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_upcoming_assignments',
      description: 'Fetch ALL upcoming assignments across all classes.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_assignment_details',
      description: 'Get deep details about 1 specific assignment.',
      parameters: {
        type: 'object',
        properties: { course_id: { type: 'string' }, assignment_id: { type: 'string' } },
        required: ['course_id', 'assignment_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_user_memory',
      description: 'Save a learned fact or preference about the user.',
      parameters: {
        type: 'object',
        properties: { preference_text: { type: 'string' } },
        required: ['preference_text'],
      },
    },
  },
]

export async function POST(req: Request) {
  let user: any = null
  let lastPrompt = ''

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { messages: incoming, pendingToolCall, toolResult, chatId } = body

    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!userData?.encrypted_canvas_key) return NextResponse.json({ error: 'Canvas key missing' }, { status: 400 })

    const canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)

    let history: any[] = []
    if (chatId) {
      const { data: cd } = await supabase.from('chats').select('messages').eq('id', chatId).single()
      history = cd?.messages || []
    }
    if (incoming?.length) {
      const nm = incoming[incoming.length - 1]
      if (nm.role === 'user') { history.push(nm); lastPrompt = nm.content || ''; }
    }
    if (toolResult && pendingToolCall) { history.push(pendingToolCall); history.push(toolResult); }

    const activeChatId = await saveHistory(supabase, user.id, history, chatId)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const send = (txt: string) => controller.enqueue(encoder.encode(txt))
        let assembled = ''

        try {
          send("Thinking...")

          const isGrade = /grade|score|how am i doing|classes/.test(lastPrompt.toLowerCase())
          const isAssign = /assignment|due|upcoming|exam|test|quiz|econ|syllabus/.test(lastPrompt.toLowerCase())

          const [memories, pGrades, pAssigns] = await Promise.all([
            supabase.from('user_memories').select('memory_text').eq('user_id', user.id),
            isGrade ? get_all_grades(canvasKey) : Promise.resolve(null),
            isAssign ? get_all_upcoming_assignments(canvasKey, userData.canvas_cache) : Promise.resolve(null)
          ])

          if (pGrades || pAssigns) send("\n(Accessed Canvas records)")

          const systemPrompt = `You are the "Ask Canvas" Assistant.
[CONTEXT]
Name: ${userData.name || "Student"}
Courses: ${JSON.stringify(userData.canvas_cache || [])}
Pre-fetched Grades: ${JSON.stringify(pGrades || "None")}
Pre-fetched Assignments: ${JSON.stringify(pAssigns || "None")}
Memories: ${memories.data?.map(m => m.memory_text).join('; ') || 'None'}
[RULES]
- If data is in context, answer IMMEDIATELY.
- Use Mermaid diagrams for complex concepts.
- Use H2 structure for long responses.`

          let currentHistory = [...history.slice(-10)]
          let iterations = 0
          let loopFinished = false

          while (iterations < 5 && !loopFinished) {
            iterations++

            // ── STREAM THE ENTIRE TURN TO KEEP VERCEL ALIVE ───────────────────
            const turnStream = await openai.chat.completions.create({
              model: 'qwen-3-235b-a22b-instruct-2507',
              stream: true,
              messages: [{ role: 'system', content: systemPrompt }, ...currentHistory],
              tools: tools as any,
              tool_choice: 'auto'
            })

            let turnText = ''
            let turnToolCalls: any[] = []

            for await (const chunk of turnStream) {
              const delta = chunk.choices[0]?.delta as any

              // If model is thinking/talking, send tokens to keep connection alive
              if (delta.content) {
                turnText += delta.content
                send(delta.content) // Keep user updated in real-time
              }

              // Handle streaming tool calls
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!turnToolCalls[tc.index]) {
                    turnToolCalls[tc.index] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } }
                  }
                  if (tc.id) turnToolCalls[tc.index].id = tc.id
                  if (tc.function?.name) turnToolCalls[tc.index].function.name += tc.function.name
                  if (tc.function?.arguments) turnToolCalls[tc.index].function.arguments += tc.function.arguments
                }
              }
            }

            // Cleanup nulls from the toolCalls map
            turnToolCalls = turnToolCalls.filter(Boolean)

            if (turnToolCalls.length > 0) {
              send("\n(Syncing with Canvas...)")

              const results = await Promise.all(turnToolCalls.map(async (tc: any) => {
                const name = tc.function.name
                const args = JSON.parse(tc.function.arguments || '{}')
                let res = ''
                try {
                  if (name === 'get_all_grades') res = JSON.stringify(await get_all_grades(canvasKey))
                  else if (name === 'get_all_upcoming_assignments') res = JSON.stringify(await get_all_upcoming_assignments(canvasKey, userData.canvas_cache))
                  else if (name === 'get_assignment_details') res = JSON.stringify(await get_assignment_details(canvasKey, args.course_id, args.assignment_id))
                  else if (name === 'save_user_memory') {
                    await supabase.from('user_memories').insert({ user_id: user.id, memory_text: args.preference_text })
                    res = "Stored."
                  }
                } catch { res = "Canvas API error." }
                return { role: 'tool', tool_call_id: tc.id, name, content: res }
              }))

              const assistantMsg = { role: 'assistant', content: turnText || null, tool_calls: turnToolCalls }
              currentHistory.push(assistantMsg)
              results.forEach(r => currentHistory.push(r))

              // Mid-loop history save (Critical for persistence)
              await saveHistory(supabase, user.id, currentHistory, activeChatId)
            } else {
              // No tools? We are done.
              loopFinished = true
              assembled = turnText
            }
          }

          // Final update
          history.push({ role: 'assistant', content: assembled })
          await saveHistory(supabase, user.id, history, activeChatId)

        } catch (err: any) {
          send("\n\n[Connection Timeout]. Please refresh and the response should be stored in your history.")
          await logError({ userId: user?.id, userPrompt: lastPrompt, err })
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
    const { data } = await supabase.from('chats').insert({ user_id: userId, messages: history }).select('id').maybeSingle()
    return data?.id
  }
}
