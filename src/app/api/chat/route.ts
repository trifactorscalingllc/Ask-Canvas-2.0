import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { get_all_grades, get_all_upcoming_assignments, get_assignment_details } from '@/lib/canvas-tools'
import { getProviderStatus, updateRateLimits, updateModelAvailability } from '@/lib/provider-monitor'
import { gradeResponse } from '@/lib/auditor'

const openai = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key',
})

const startTime = Date.now()

// ── Service-role Supabase client ──────────────────────────────────────────────
let _supabaseService: any = null
function getSupabaseService() {
  if (_supabaseService) return _supabaseService
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(`[Supabase Service Role] MISSING: url=${!!url}, key=${!!key}`)
    return null
  }
  console.log(`[Supabase Service Role] Initializing with URL: ${url}`)
  _supabaseService = createServiceClient(url, key)
  return _supabaseService
}

async function logError(opts: { userId?: string, userPrompt?: string, agentResponse?: string, err: any }) {
  try {
    const msg = String(opts.err?.message ?? opts.err ?? '')
    console.error(`[DIAGNOSTIC LOG]: ${msg}`)
    const service = getSupabaseService()
    if (!service) return
    await service.from('error_logs').insert({
      user_id: opts.userId ?? null,
      user_prompt: opts.userPrompt ?? null,
      agent_response: opts.agentResponse ?? null,
      error_type: msg.toLowerCase().includes('timeout') ? 'timeout' : 'runtime_error',
      error_message: msg.slice(0, 2000),
      problem_identifier: msg.toLowerCase().includes('timeout') ? 'Vercel/Network Timeout' : 'Internal processing error'
    })
  } catch (e) {
    console.error('Logging failed:', e)
  }
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
    const { messages: incoming, chatId } = body

    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!userData || !userData.encrypted_canvas_key || !userData.iv) {
      return NextResponse.json({ error: 'Canvas key missing' }, { status: 400 })
    }

    const canvasKey = decrypt(userData.encrypted_canvas_key as string, userData.iv as string)

    let history: any[] = []
    if (chatId) {
      const { data: cd } = await supabase.from('chats').select('messages').eq('id', chatId).single()
      history = (cd?.messages as any[]) || []
    }
    if (incoming?.length) {
      const nm = incoming[incoming.length - 1]
      if (nm.role === 'user') { history.push(nm); lastPrompt = nm.content || ''; }
    }

    let activeChatId = await saveHistory(supabase, user.id, history, chatId)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const send = (txt: string) => controller.enqueue(encoder.encode(txt))
        let combinedText = ''
        let loopFinished = false
        let iterations = 0

        // START: Initial Pulse
        send("\u200B")

        const status = await getProviderStatus().catch(() => null);
        if (status?.cerebras_rate_limits) {
          const limits = status.cerebras_rate_limits;
          history.push({ role: 'assistant', content: `[INTERNAL] Rate Limit Status: ${limits.requests_remaining}/${limits.requests_limit} reqs, ${limits.tokens_remaining} tokens left.` });
        }
        // Refresh models once in a while
        if (Math.random() > 0.9) {
          updateModelAvailability(process.env.CEREBRAS_API_KEY!).catch(() => null);
        }

        try {
          const isGrade = /grade|score|how am i doing|classes/.test(lastPrompt.toLowerCase())
          const isAssign = /assignment|due|upcoming|exam|test|quiz|syllabus/.test(lastPrompt.toLowerCase())

          history.push({ role: 'assistant', content: `[INTERNAL] Starting data pre-fetch for prompt: "${lastPrompt}"` })
          const [memories, pGrades, pAssigns] = await Promise.all([
            supabase.from('user_memories').select('memory_text').eq('user_id', user.id),
            isGrade ? get_all_grades(canvasKey) : Promise.resolve(null),
            isAssign ? get_all_upcoming_assignments(canvasKey, userData.canvas_cache as any) : Promise.resolve(null)
          ])
          history.push({ role: 'assistant', content: `[INTERNAL] Pre-fetch complete. Found ${pGrades ? "grades" : "no grades"} and ${pAssigns ? pAssigns.length + " assignments" : "no assignments"}` })

          const systemPrompt = `You are the "Ask Canvas" Assistant. v2.0-robust.
[CRITICAL: FRESH DATA POLICY]
1. PRE-FETCHED data is for context ONLY. 
2. ALWAYS use your TOOLS to get live data if the user asks for current grades, assignments, or schedules. NEVER respond based on pre-fetched data alone.
3. If you have " Bobby the Entrepreneur " in pre-fetch, still CALL 'get_all_upcoming_assignments' to verify it is still there.

[CONTEXT]
Name: ${userData.name || "Student"}
Courses: ${JSON.stringify(userData.canvas_cache || [])}
Pre-fetched (STALE/CONTEXT ONLY):
- Grades: ${JSON.stringify(pGrades || "None")}
- Assignments: ${JSON.stringify(pAssigns || "None")}
Memories: ${memories.data?.map((m: any) => m.memory_text).join('; ') || 'None'}

[STRICT FORMATTING]
1. Mermaid graphs: Wrap in \`\`\`mermaid blocks on new lines.
2. Tables: MUST use standard Markdown with pipes (|) and a divider row.
   EXAMPLE:
   | Course | Assignment | Due Date |
   |:-------|:-----------|:---------|
   | **ECON 102** | **Bobby the Entrepreneur Assignment** | March 26, 2026, 11:00 AM (EST) |
3. Spacing: Use double newlines between paragraphs and visuals.
4. Bold: Use **bold** for EVERY Course and Assignment name inside table cells.
5. Dates: Use "Month Day, Year, HH:MM AM/PM (Timezone)" format (e.g., "March 26, 2026, 11:00 AM (EST)").

[CANVAS ACADEMIC CONTEXT]
- Season: Spring 2026
- Rule: UNLESS EXPLICITLY TOLD OTHERWISE, only reference Spring 2026 / Spring semester classes in response to queries about assignments, grades, or courses. Ignore older classes unless the user mentions them.

[CONTEXT & RESPONSE POLICY]
1. **Strict Prompt Adherence**: Only respond to the latest user message. Do not repeat previous information (like assignment lists) unless specifically asked for or needed to answer the new question.
2. **Reference Resolution**: If the user uses pronouns or vague terms (e.g., "that assignment," "it," "the class"), use the conversation history to identify the specific object being discussed.
3. **Minimalism**: If the user asks for "classes," do not volunteer "assignments" unless they are integrated into a course overview. NEVER re-display a table or list that was already shown in the history unless the user explicitly asks for it again or it needs updating.`

          let currentHistory = [...history.slice(-10)]
          let anyToolsCalledAcrossIterations = false

          while (iterations < 5 && !loopFinished) {
            iterations++

            // SECURITY: If we are close to Vercel's 60s limit (50s), force stop.
            const elapsed = Date.now() - startTime
            if (elapsed > 45000) {
              const timeoutMsg = iterations === 1 && !combinedText
                ? "(Note: Request timed out during initial data fetch. Please try a smaller date range.)"
                : "(Note: Results partial due to processing limits)";
              send("\n\n" + timeoutMsg)
              history.push({ role: 'assistant', content: `[INTERNAL] Timeout reached at ${elapsed}ms. Stopping iterations.` })
              loopFinished = true
              break
            }

            // HEARTBEAT: Explicitly send a character before starting a long LLM turn
            send("\u200B")
            history.push({ role: 'assistant', content: `[INTERNAL] Starting AI iteration ${iterations}...` })

            const turnStream = await openai.chat.completions.create({
              model: 'qwen-3-235b-a22b-instruct-2507',
              stream: true,
              messages: [{ role: 'system', content: systemPrompt }, ...currentHistory],
              tools: tools as any,
              tool_choice: 'auto'
            })

            // Track rate limits from the response
            try {
              const streamWithResponse = turnStream as any;
              if (streamWithResponse.response) {
                // Awaiting here to ensure it persists before next chunk/loop ends
                await updateRateLimits(streamWithResponse.response.headers);
              }
            } catch (err) {
              console.warn('[MONITOR] Failed to capture headers:', err);
            }

            let turnText = ''
            let turnToolCalls: any[] = []

            for await (const chunk of turnStream) {
              const delta = chunk.choices[0]?.delta as any
              if (delta.content) {
                turnText += delta.content
                send(delta.content)
              }
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

            combinedText += turnText
            turnToolCalls = turnToolCalls.filter(Boolean)

            if (turnToolCalls.length > 0) {
              anyToolsCalledAcrossIterations = true
              // HEARTBEAT: Before tool calls
              send("\u200B")
              history.push({ role: 'assistant', content: `[INTERNAL] Executing tool calls: ${turnToolCalls.map(tc => tc.function.name).join(', ')}` })

              const results = await Promise.all(turnToolCalls.map(async (tc: any) => {
                const name = tc.function.name
                const args = JSON.parse(tc.function.arguments || '{}')
                try {
                  if (name === 'get_all_grades') return { role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(await get_all_grades(canvasKey)) }
                  if (name === 'get_all_upcoming_assignments') return { role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(await get_all_upcoming_assignments(canvasKey, userData.canvas_cache as any)) }
                  if (name === 'get_assignment_details') return { role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(await get_assignment_details(canvasKey, args.course_id, args.assignment_id)) }
                  if (name === 'save_user_memory') {
                    await supabase.from('user_memories').insert({ user_id: user.id, memory_text: args.preference_text })
                    return { role: 'tool', tool_call_id: tc.id, name, content: "Stored." }
                  }
                } catch { return { role: 'tool', tool_call_id: tc.id, name, content: "Error." } }
                return { role: 'tool', tool_call_id: tc.id, name, content: "N/A" }
              }))

              const assistantMsg = { role: 'assistant', content: turnText || null, tool_calls: turnToolCalls }
              currentHistory.push(assistantMsg)
              results.forEach(r => currentHistory.push(r))

              // HEARTBEAT: After tools, before next LLM turn
              send("\u200B")
            } else {
              loopFinished = true
            }
          }

          // BLANK BOX DETECTION
          if (!combinedText && iterations >= 1 && !anyToolsCalledAcrossIterations) {
            const blankError = "Blank Box - Empty AI Response. This could be due to rate limits or an internal model failure.";
            history.push({ role: 'assistant', content: `[INTERNAL] ${blankError}` });
            await logError({ userId: user?.id, userPrompt: lastPrompt, err: new Error(blankError) });
            // Send a fallback message so the user isn't stuck with a blank box
            send("(The assistant provided an empty response. This usually indicates a temporary issue with the AI provider. Please try again.)");
          }

          history.push({ role: 'assistant', content: combinedText })
          // Ensure we capture the ID for new chats so the auditor can update them
          activeChatId = await saveHistory(supabase, user.id, history, activeChatId)

          console.log(`[CHAT] Turn complete. Triggering auditor for chatId: ${activeChatId}`)

          try {
            // AUDIT: Await before closing to ensure Vercel doesn't kill the process
            await gradeResponse({
              userId: user.id,
              chatId: activeChatId,
              userPrompt: lastPrompt,
              agentResponse: combinedText,
              history: history
            });
            console.log('[CHAT] Auditor finished successfully');
          } catch (e) {
            console.error('[AUDITOR] Trigger Error:', e);
          }

        } catch (err: any) {
          const timeoutMsg = "\n\n(Connection Trace: v2.0.2-timeboxed) Processing took too long. History saved. Please refresh.";
          send(timeoutMsg);
          await logError({ userId: user?.id, userPrompt: lastPrompt, agentResponse: combinedText + timeoutMsg, err });
        } finally {
          controller.close();
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
    await logError({ err, userPrompt: 'Initial sync/setup phase (Pre-stream)' });
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
