import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { fetch_canvas_graphql_context } from '@/lib/canvas-tools'
import { streamText, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || '',
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { messages, userName = 'Student' } = await req.json()
    const firstName = userName.split(' ')[0]

    // 1. Fetch User Encryption Keys
    const { data: userData } = await supabase
      .from('users')
      .select('encrypted_canvas_key, iv')
      .eq('id', user.id)
      .single()

    if (!userData?.encrypted_canvas_key || !userData?.iv) {
      return new Response('Canvas connection required', { status: 400 })
    }

    const canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)
    const currentDate = new Date().toISOString()

    // 2. Stream AI Response
    const result = streamText({
      model: cerebras('llama-3.3-70b') as any,
      messages,
      system: `You are "Ask Canvas Assistant" v2.6 (Smart View Orchestration). 
You are talking directly to ${firstName}. Address them by their name occasionally and act as their highly intelligent, personal academic advisor.
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
1. Academic data MUST come from the tools. No hallucination.`,
      tools: {
        get_full_academic_context: (tool as any)({
          description: 'Fetch absolute academic state (grades, assignments, courses). Call this before rendering any smart view.',
          parameters: z.object({}),
          execute: async () => {
            console.log('[TOOL] Fetching full academic context...')
            return await fetch_canvas_graphql_context(canvasKey)
          },
        }) as any,
        render_smart_view: (tool as any)({
          description: 'Render a premium React-based academic view. Use this to show assignments, workload, or priorities. NEVER use raw data tables.',
          parameters: z.object({
            viewType: z.enum(['workload_chart', 'triage_cards', 'timeline_list']),
          }),
          // No execute function for client-side tool
        }),
        save_user_memory: (tool as any)({
          description: 'Save a learned fact or preference about the user.',
          parameters: z.object({
            preference_text: z.string().describe('The fact or preference to remember.'),
          }),
          execute: async ({ preference_text }: any) => {
            await supabase.from('user_memories').insert({ user_id: user.id, memory_text: preference_text })
            return { status: 'stored' }
          },
        }),
      } as any,
      maxSteps: 5 as any,
      onFinish: async ({ text, toolCalls, toolResults }: any) => {
        // Optional: Log to database or analytics here
        console.log('[FINISH] Token Generation Complete')
      },
    } as any)

    return (result as any).toDataStreamResponse()
  } catch (error) {
    console.error('[CEREBRAS API ERROR]:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
