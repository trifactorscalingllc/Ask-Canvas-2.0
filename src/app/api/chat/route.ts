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

const openai = observeOpenAI(new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key',
}))

// Client for embeddings (Using proxy/unified key as requested)
const embeddingClient = observeOpenAI(new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY
}))

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
      name: 'get_full_academic_context',
      description: 'Call this tool WHENEVER the user asks for ANY Canvas data, information, lists of assignments, grades, or class schedules. IMPORTANT: You MUST present the returned data using GitHub-flavored Markdown Tables. Avoid conversational filler.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_grade_chart',
      description: 'Render an interactive BarChart of assignment grades.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                score: { type: 'number' },
                max: { type: 'number' }
              }
            }
          }
        },
        required: ['data']
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_timeline',
      description: 'Render a chronological vertical timeline of upcoming assignments.',
      parameters: {
        type: 'object',
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dueAt: { type: 'string' },
                courseName: { type: 'string' }
              }
            }
          }
        },
        required: ['assignments']
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_progress_circle',
      description: 'Render a radial Progress Circle chart for visualizing grade distributions or student term progress.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number', description: '0-100 percentage' },
                fill: { type: 'string', description: 'Hex color' }
              }
            }
          },
          title: { type: 'string' }
        },
        required: ['data']
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
        // Refresh models once in a while
        if (Math.random() > 0.9) {
          updateModelAvailability(process.env.CEREBRAS_API_KEY!).catch(() => null);
        }

        try {
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

            // SECURITY: If we are close to Vercel's 60s limit (50s), force stop.
            const elapsed = Date.now() - startTime
            if (elapsed > 45000) {
              const timeoutMsg = iterations === 1 && !combinedText
                ? "(Note: Request timed out during initial data fetch. Please try a smaller date range.)"
                : "(Note: Results partial due to processing limits)";
              send("\n\n" + timeoutMsg)
              history.push({ role: 'assistant', content: `[INTERNAL] Timeout reached at ${elapsed} ms.Stopping iterations.` })
              loopFinished = true
              break
            }

            // HEARTBEAT: Explicitly send a character before starting a long LLM turn
            send("\u200B")
            history.push({ role: 'assistant', content: `[INTERNAL] Starting AI iteration ${iterations}...` })

            const turnStream = await getCompletion([{ role: 'system', content: systemPrompt }, ...currentHistory]);

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
                  if (name === 'get_full_academic_context') {
                    const res = await fetch_canvas_graphql_context(canvasKey);
                    if (res.scan_trace) {
                      history.push({ role: 'assistant', content: `[INTERNAL] ${res.scan_trace}` });
                    }
                    return { role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(res) };
                  }
                  if (name === 'query_syllabus_policy') {
                    console.log("[INTERNAL] Generating Embedding for RAG Query...");
                    const embeddingResponse = await embeddingClient.embeddings.create({
                      model: 'text-embedding-3-small',
                      input: args.question
                    });
                    const embedding = embeddingResponse.data[0].embedding;

                    const { data: chunks, error } = await (supabase.rpc as any)('match_course_documents', {
                      query_embedding: embedding,
                      match_threshold: 0.5,
                      match_count: 3,
                      filter_course_id: args.course_id
                    });

                    if (error) throw error;
                    return { role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(chunks || []) };
                  }
                  if (name === 'render_grade_chart' || name === 'render_timeline') {
                    return { role: 'tool', tool_call_id: tc.id, name, content: "UI Rendered." }
                  }
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
              // BLANK BOX AUTO-RETRY: If the first iteration yielded NOTHING, try one more time before giving up.
              if (!combinedText && iterations === 1 && !anyToolsCalledAcrossIterations) {
                history.push({ role: 'assistant', content: `[INTERNAL] Blank Box detected. Retrying once...` })
                continue; // Skip setting loopFinished and try again
              }
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

          console.log(`[CHAT] Turn complete.Triggering auditor for chatId: ${activeChatId} `)

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
