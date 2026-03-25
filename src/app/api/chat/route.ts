import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { get_active_courses, get_current_grades, get_upcoming_assignments, get_all_upcoming_assignments } from '@/lib/canvas-tools'

const openai = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key',
})

/** Remove any <tool_call>...</tool_call> XML that Qwen sometimes emits inline */
function stripToolCallXml(content: string | null | undefined): string {
  if (!content) return ''
  return content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').replace(/<tool_response>[\s\S]*?<\/tool_response>/g, '').trim()
}

const tools = [
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
]

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { messages: incomingMessages, pendingToolCall, toolResult, chatId } = body

    if (!process.env.CEREBRAS_API_KEY) {
      return NextResponse.json({ error: 'CEREBRAS_API_KEY is missing from the Server Environment Variables! The AI Engine cannot power on.' }, { status: 500 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('encrypted_canvas_key, iv')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !userData.encrypted_canvas_key || !userData.iv) {
      return NextResponse.json({ error: 'User setup incomplete or Canvas key missing' }, { status: 400 })
    }

    let canvasKey = ''
    try {
       canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)
    } catch {
       return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
    }

    let history: any[] = []
    
    if (chatId) {
      const { data: chatData } = await supabase
        .from('chats')
        .select('messages')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .maybeSingle()
      history = Array.isArray(chatData?.messages) ? chatData?.messages : []
    }
    
    if (incomingMessages && incomingMessages.length > 0) {
      const newMsg = incomingMessages[incomingMessages.length - 1]
      if (newMsg.role === 'user') {
        history.push(newMsg)
      }
    }

    if (toolResult && pendingToolCall) {
       history.push(pendingToolCall)
       history.push(toolResult)
    }

    // [New Architecture] Save the User's exact prompt to the Database FIRST!
    const activeChatId = await saveHistory(supabase, user.id, history, chatId)

    const recentHistory = history.slice(-10)

    const systemPrompt = `You are Ask Canvas AI, a proactive academic assistant with direct access to the user's Canvas LMS.

TOOL ROUTING RULES (follow exactly):
- schedule/upcoming/due this week/next week/any assignment list -> call get_all_upcoming_assignments immediately. Do NOT call get_active_courses first. It handles everything internally.
- specific course assignments -> call get_upcoming_assignments with course_id.
- grades -> call get_current_grades.
- list courses -> call get_active_courses.
- NEVER invent tool names. Use only the OpenAI tool_calls API. No XML tags.
- Format responses as clean markdown. Today: ${new Date().toDateString()}.`

    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'qwen-3-235b-a22b-instruct-2507',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory.map((m: any) => ({
            role: m.role,
            content: m.content || '',
            tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id,
            name: m.name
          }))
        ],
        tools: tools as any,
        tool_choice: 'auto',
      })
    } catch (engineError: any) {
      if (engineError.status === 404) {
        throw new Error(`The requested AI model string does not exist in the provider's registry (404 Not Found). Please verify the exact model ID spelling.`);
      }
      throw engineError;
    }

    const message = response.choices[0].message

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as any
      const { name, arguments: argsString } = toolCall.function
      const args = JSON.parse(argsString || '{}')

      if (name.startsWith('get_')) {
        let resultString = '';
        try {
          if (name === 'get_active_courses') {
            const courses = await get_active_courses(canvasKey);
            resultString = JSON.stringify(courses);
          } else if (name === 'get_current_grades') {
            const grades = await get_current_grades(canvasKey, args.course_id);
            resultString = JSON.stringify(grades);
          } else if (name === 'get_all_upcoming_assignments') {
            const assignments = await get_all_upcoming_assignments(canvasKey);
            resultString = JSON.stringify(assignments);
          } else if (name === 'get_upcoming_assignments') {
            const assignments = await get_upcoming_assignments(canvasKey, args.course_id);
            resultString = JSON.stringify(assignments);
          } else {
            resultString = "Tool not implemented.";
          }
        } catch (err: any) {
          if (err.message === '401_UNAUTHORIZED') {
            resultString = "Your Canvas API key appears to be invalid or expired. Please update it in your settings.";
          } else {
            resultString = `Canvas API error: ${err.message}`;
          }
        }

        // Strip any raw XML before saving the intermediate tool-call message
        const cleanedMsg = { ...message, content: stripToolCallXml(message.content) }
        history.push(cleanedMsg)
        history.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: resultString
        })

        const secondResponse = await openai.chat.completions.create({
          model: 'qwen-3-235b-a22b-instruct-2507',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-12).map((m: any) => ({
               role: m.role,
               content: m.content || '',
               tool_calls: m.tool_calls,
               tool_call_id: m.tool_call_id,
               name: m.name
            }))
          ]
        })

        const finalMsg = secondResponse.choices[0].message
        history.push(finalMsg)
        
        await saveHistory(supabase, user.id, history, activeChatId)
        return NextResponse.json({ ...finalMsg, chatId: activeChatId })

      } else if (name === 'log_missing_tool') {
        await supabase.from('proposed_tools').insert({
          user_id: user.id,
          requested_feature: args.requested_feature
        })

        history.push(message)
        history.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: "Successfully logged requested feature to the developers."
        })

        const secondResponse = await openai.chat.completions.create({
          model: 'qwen-3-235b-a22b-instruct-2507',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map((m: any) => ({
               role: m.role,
               content: m.content || '',
               tool_calls: m.tool_calls,
               tool_call_id: m.tool_call_id,
               name: m.name
            }))
          ]
        })

        const finalMsg = secondResponse.choices[0].message
        history.push(finalMsg)

        await saveHistory(supabase, user.id, history, activeChatId)
        return NextResponse.json({ ...finalMsg, chatId: activeChatId })

      } else if (name.startsWith('post_')) {
        history.push(message)
        await saveHistory(supabase, user.id, history, activeChatId)
        
        return NextResponse.json({
          status: 'requires_confirmation',
          toolCall: toolCall,
          message: 'This action requires your confirmation before writing to Canvas.',
          functionName: name,
          arguments: args,
          chatId: activeChatId
        })
      }
    }

    history.push(message)
    await saveHistory(supabase, user.id, history, activeChatId)

    return NextResponse.json({ ...message, chatId: activeChatId })

  } catch (err: any) {
    console.error('API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function saveHistory(supabase: any, userId: string, history: any[], chatId?: string) {
  if (chatId) {
    const { error: updateError } = await supabase.from('chats').update({ messages: history, updated_at: new Date().toISOString() }).eq('id', chatId)
    if (updateError) console.error('SaveHistory Update Error:', updateError)
    return chatId;
  } else {
    const { data: insertData, error: insertError } = await supabase.from('chats').insert({ user_id: userId, messages: history }).select('id').maybeSingle()
    if (insertError) console.error('SaveHistory Insert Error:', insertError)
    return insertData?.id;
  }
}
