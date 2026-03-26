import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/crypto'
import { observeOpenAI } from '@langfuse/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { fetch_canvas_graphql_context, get_assignment_details } from '@/lib/canvas-tools'
import { getProviderStatus, updateRateLimits, updateModelAvailability } from '@/lib/provider-monitor'
import { gradeResponse } from '@/lib/auditor'

const baseClient = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key',
})
const openai = observeOpenAI(baseClient)

// Client for embeddings (Using proxy/unified key as requested)
const baseEmbeddingClient = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY
})
const embeddingClient = observeOpenAI(baseEmbeddingClient)

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
    await (service.from('error_logs') as any).insert({
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
      name: 'render_smart_view',
      description: 'Render a premium React-based academic view. Use this to show assignments, workload, or priorities. NEVER use raw data tables.',
      parameters: {
        type: 'object',
        properties: {
          viewType: {
            type: 'string',
            enum: ['workload_chart', 'triage_cards', 'timeline_list'],
            description: 'The type of visual asset to render.'
          }
        },
        required: ['viewType']
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_full_academic_context',
      description: 'Fetch absolute academic state (grades, assignments, courses). Call this before rendering any smart view.',
      parameters: { type: 'object', properties: {} },
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
    const currentDate = new Date().toISOString();

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

        try {
          const [memories] = await Promise.all([
            supabase.from('user_memories').select('memory_text').eq('user_id', user.id),
          ])

          const systemPrompt = `You are "Ask Canvas Assistant" v2.5 (Smart View Architecture). 
CURRENT DATE: ${currentDate}

[OMNIBUS PROTOCOL: SMART VIEW ORCHESTRATION]
You are a premium academic agent. You NEVER output raw data tables in text.

1. DATA GATHERING: Always call 'get_full_academic_context' first.
2. VISUALIZATION: Choose the best 'viewType' for the request:
   - 'workload_chart': Performance forecasting & point trends.
   - 'triage_cards': Immediate priorities (< 5 items) with urgency indicators.
   - 'timeline_list': Sequential schedules or massive lists of tasks.
3. EXECUTION: Call 'render_smart_view' exactly ONCE.
4. CLOSING: After the tool call, provide a brief (1-2 sentence) encouraging status summary.

[FORMATTING]
1. NO RAW TABLES: Absolutely forbidden. Use Smart Views.
2. NO WALLS OF TEXT: Keep conversational filler to 1-2 sentences max when a tool is used.

[AI-IS-TRUTH POLICY]
1. Academic data MUST come from the tools. No hallucination.`;

          let currentHistory = [...history.slice(-10)]
          let anyToolsCalledAcrossIterations = false

          // Resilience Helper: Exponential Backoff + Model Fallback
          const getCompletion = async (msgs: any[], retryCount = 0): Promise<any> => {
            try {
              return await openai.chat.completions.create({
                model: retryCount > 0 ? 'qwen-2.5-72b-instruct' : 'qwen-3-235b-a22b-instruct-2507',
                stream: true,
                messages: msgs,
                tools: tools as any,
                tool_choice: 'auto'
              });
            } catch (err: any) {
              if (err?.status === 429 && retryCount < 2) {
                const wait = Math.pow(2, retryCount) * 1000;
                send(`\n\n[SYSTEM] Rate limit hit. Retrying in ${wait / 1000}s...`);
                await new Promise(r => setTimeout(r, wait));
                return getCompletion(msgs, retryCount + 1);
              }
              throw err;
            }
          };

          while (iterations < 3 && !loopFinished) {
            iterations++

            // SECURITY: If we are close to Vercel's 60s limit (55s), force stop.
            const elapsed = Date.now() - startTime
            if (elapsed > 55000) {
              send("\n\n(Note: Results partial due to processing limits)");
              history.push({ role: 'assistant', content: `[INTERNAL] Timeout reached at ${elapsed} ms.Stopping iterations.` })
              loopFinished = true
              break
            }

            // HEARTBEAT
            send("\u200B")
            history.push({ role: 'assistant', content: `[INTERNAL] Starting AI iteration ${iterations}...` })

            const turnStream = await getCompletion([{ role: 'system', content: systemPrompt }, ...currentHistory]);

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
              send("\u200B")
              history.push({ role: 'assistant', content: `[INTERNAL] Executing tool calls: ${turnToolCalls.map(tc => tc.function.name).join(', ')}` })

              const results = await Promise.all(turnToolCalls.map(async (tc: any) => {
                const name = tc.function.name
                const args = JSON.parse(tc.function.arguments || '{}')
                try {
                  if (name === 'get_full_academic_context') {
                    const res = await fetch_canvas_graphql_context(canvasKey);
                    return { role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(res) };
                  }
                  if (name === 'render_smart_view') {
                    // HANDOFF: UI trigger stops iterations after the summary is generated in the NEXT turn
                    // or if the model already provided text alongside the tool.
                    // Actually, the user wants a summary AFTER the tool call.
                    // So we must allow one more iteration.
                    return { role: 'tool', tool_call_id: tc.id, name, content: "UI Rendered. Provide summary." }
                  }
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

              // If render_smart_view was called, we allow one more iteration for the summary then stop.
              if (turnToolCalls.some(tc => tc.function.name === 'render_smart_view')) {
                // Continue to get the closing summary
              }
            } else {
              loopFinished = true
            }
          }

          history.push({ role: 'assistant', content: combinedText })
          activeChatId = await saveHistory(supabase, user.id, history, activeChatId)

          try {
            await gradeResponse({
              userId: user.id,
              chatId: activeChatId,
              userPrompt: lastPrompt,
              agentResponse: combinedText,
              history: history
            });
          } catch (e) {
            console.error('[AUDITOR] Trigger Error:', e);
          }

        } catch (err: any) {
          const timeoutMsg = "\n\n(Connection Trace: v2.5.0-smartview) Processing took too long. History saved. Please refresh.";
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
    await logError({ err, userPrompt: 'Initial sync/setup phase' });
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
