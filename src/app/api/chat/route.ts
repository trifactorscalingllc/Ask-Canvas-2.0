import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'

const openai = new OpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY || 'dummy_key', // Required environment variable
})

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
      description: 'Fetch the users current grades for all courses from Canvas.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_assignments',
      description: 'Fetch upcoming assignments across all courses.',
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
    const { messages: incomingMessages, pendingToolCall, toolResult } = body

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('encrypted_canvas_key, iv')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User setup incomplete' }, { status: 400 })
    }

    let canvasKey = ''
    try {
       canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)
    } catch {
       return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
    }

    const { data: chatData } = await supabase
      .from('chats')
      .select('messages')
      .eq('user_id', user.id)
      .single()

    let history: any[] = chatData?.messages || []
    
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

    const recentHistory = history.slice(-10)

    const response = await openai.chat.completions.create({
      model: 'llama3.1-70b',
      messages: [
        { role: 'system', content: 'You are Ask Canvas 2.0. Answer questions about the user\'s Canvas LMS using the tools provided. If you call log_missing_tool, you must inform the user that their request has been logged successfully.' },
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

    const message = response.choices[0].message

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0]
      const { name, arguments: argsString } = toolCall.function
      const args = JSON.parse(argsString || '{}')

      if (name.startsWith('get_')) {
        // GET Tools: Mock Interceptor
        const canvasData = { status: 'mocked_canvas_data', tool: name, message: "Decrypted Canvas Key used successfully behind the scenes." }
        const resultString = JSON.stringify(canvasData)

        history.push(message)
        history.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: resultString
        })

        const secondResponse = await openai.chat.completions.create({
          model: 'llama3.1-70b',
          messages: [
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
        
        await saveHistory(supabase, user.id, history)
        return NextResponse.json(finalMsg)

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
          model: 'llama3.1-70b',
          messages: [
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

        await saveHistory(supabase, user.id, history)
        return NextResponse.json(finalMsg)

      } else if (name.startsWith('post_')) {
        history.push(message)
        await saveHistory(supabase, user.id, history)
        
        return NextResponse.json({
          status: 'requires_confirmation',
          toolCall: toolCall,
          message: 'This action requires your confirmation before writing to Canvas.',
          functionName: name,
          arguments: args
        })
      }
    }

    if (message.content) {
      history.push(message)
      await saveHistory(supabase, user.id, history)
    }

    return NextResponse.json(message)

  } catch (err: any) {
    console.error('API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function saveHistory(supabase: any, userId: string, history: any[]) {
  const { data } = await supabase.from('chats').select('id').eq('user_id', userId).single()
  if (data) {
    await supabase.from('chats').update({ messages: history, updated_at: new Date().toISOString() }).eq('id', data.id)
  } else {
    await supabase.from('chats').insert({ user_id: userId, messages: history })
  }
}
