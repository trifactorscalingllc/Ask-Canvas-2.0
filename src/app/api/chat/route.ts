import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow 60 seconds for multi-step AI reasoning
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
      .select('encrypted_canvas_key, iv, canvas_cache, name, avatar_url')
      .eq('id', user.id)
      .single()

    const { data: memories } = await supabase
      .from('user_memories')
      .select('memory_text')
      .eq('user_id', user.id)

    if (userError || !userData || !userData.encrypted_canvas_key || !userData.iv) {
      return NextResponse.json({ error: 'User setup incomplete or Canvas key missing' }, { status: 400 })
    }

    let canvasKey = ''
    try {
       canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)
    } catch {
       return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
    }

    // Lazy Hydration of Cold Data & Profile
    if (!userData.canvas_cache || !userData.name) {
      try {
        const updates: any = {}
        if (!userData.canvas_cache) {
          const courses = await get_active_courses(canvasKey)
          updates.canvas_cache = courses
          userData.canvas_cache = courses
        }
        if (!userData.name) {
          const profile = await get_user_profile(canvasKey)
          updates.name = profile.short_name || profile.name
          updates.avatar_url = profile.avatar_url
          userData.name = updates.name
          userData.avatar_url = updates.avatar_url
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('users').update(updates).eq('id', user.id)
        }
      } catch (e) {
        console.error('Failed to lazy-hydrate canvas metadata', e)
      }
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

TOOL ROUTING RULES (CRITICAL):
- USE ONLY the standardized OpenAI/Cerebras 'tool_calls' array for all functions. 
- NEVER output XML tags like <tool_call>, <function_call>, or <thought>. 
- NEVER mention tool names in your text response.
- If you call a tool, your content MUST be empty or a brief "Thinking...".
- When a "study model", "exam prep", "visual", or "diagram" is requested, YOU MUST generate a Mermaid diagram in your FINAL response (after all tool calls) using \` \` \`mermaid \` \` \` syntax.

FORMATTING RULES (STRICT):
1. **No blocks of text**: Break everything into headers (#, ##), bold labels, and indenting.
2. **Mandatory Visuals**: Generate Mermaid diagrams for ANY complex conceptual request.
3. **Visual Hierarchy**: Use H1 for main topic, H2 for subtopics.
4. **File Embedding**: If you reference a direct file URL, YOU MUST embed it at the BOTTOM of your message using \`[File Title](embed:URL)\`.
5. **Emojis**: Use Section-only emojis (ex: 📊 Topics). 
6. **Bolding**: Bold key terms (ex: **Macroeconomics**) for scannability.
7. **Button Links**: Standard links = \`[Button Text](URL)\`.

[KNOWN USER CONTEXT]
First Name: ${userData.name ? userData.name.split(' ')[0] : "Student"}
Active Courses (Canvas ID Mapping): ${userData.canvas_cache ? JSON.stringify(userData.canvas_cache) : "Unknown"}

INSTRUCTIONS FOR DATA ACCESS:
- IF 'Active Courses' above has a list, YOU ALREADY HAVE THE IDs. DO NOT call get_active_courses.
- Use the numeric ID directly from the list above.
- If you have the data, PROCEED IMMEDIATELY TO THE FINAL RESPONSE.
- User Preferences/Memories: ${memories?.length ? memories.map(m => m.memory_text).join('; ') : "None"}`

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

    let currentMessage = response.choices[0].message as any
    let iterations = 0
    const maxIterations = 5

    while (iterations < maxIterations) {
      iterations++

      // [HEALING] Fallback for models that drift into XML tool-calling
      if (!currentMessage.tool_calls && currentMessage.content?.includes('<tool_call>')) {
        try {
          const match = /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/i.exec(currentMessage.content)
          if (match) {
            const parsed = JSON.parse(match[1])
            currentMessage.tool_calls = [{
              id: `call_fb_${Math.random().toString(36).substr(2, 5)}`,
              type: 'function',
              function: {
                name: parsed.name,
                arguments: typeof parsed.arguments === 'string' ? parsed.arguments : JSON.stringify(parsed.arguments)
              }
            }]
          }
        } catch (e) {
          console.error('Failed to parse heal-fallback XML tool call', e)
        }
      }

      // Check if we have tool calls to process
      if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
        
        // Handle Confirmation-Required Tools (post_...) - These break the loop immediately
        const postCall = currentMessage.tool_calls.find((tc: any) => tc.function.name.startsWith('post_'))
        if (postCall) {
          history.push(currentMessage)
          const finalId = await saveHistory(supabase, user.id, history, activeChatId)
          return NextResponse.json({
            status: 'requires_confirmation',
            toolCall: postCall,
            message: 'This action requires your confirmation before writing to Canvas.',
            functionName: postCall.function.name,
            arguments: JSON.parse(postCall.function.arguments || '{}'),
            chatId: finalId
          })
        }

        // Parallel Execute ALL Tool Calls in the array
        const results = await Promise.all(currentMessage.tool_calls.map(async (toolCall: any) => {
          const { name, arguments: argsString } = toolCall.function
          const args = JSON.parse(argsString || '{}')
          let resultString = ''

          try {
            if (name === 'save_user_memory') {
              const { error } = await supabase.from('user_memories').insert({ user_id: user.id, memory_text: args.preference_text })
              if (error) throw new Error(error.message)
              resultString = "Memory saved successfully."
            } else if (name === 'get_assignment_details') {
              resultString = JSON.stringify(await get_assignment_details(canvasKey, args.course_id, args.assignment_id))
            } else if (name === 'get_active_courses') {
              resultString = JSON.stringify(await get_active_courses(canvasKey))
            } else if (name === 'get_current_grades') {
              resultString = JSON.stringify(await get_current_grades(canvasKey, args.course_id))
            } else if (name === 'get_all_upcoming_assignments') {
              resultString = JSON.stringify(await get_all_upcoming_assignments(canvasKey))
            } else if (name === 'get_upcoming_assignments') {
              resultString = JSON.stringify(await get_upcoming_assignments(canvasKey, args.course_id))
            } else if (name === 'log_missing_tool') {
              await supabase.from('proposed_tools').insert({ user_id: user.id, requested_feature: args.requested_feature })
              resultString = "Successfully logged requested feature to the developers."
            } else {
              resultString = "Tool not implemented."
            }
          } catch (err: any) {
            resultString = err.message === '401_UNAUTHORIZED' 
              ? "Your Canvas API key is invalid or expired." 
              : `Canvas API error: ${err.message}`
          }

          return {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: name,
            content: resultString
          }
        }))

        // Push messages to history
        const cleanedMsg = { ...currentMessage, content: stripToolCallXml(currentMessage.content) }
        history.push(cleanedMsg)
        results.forEach(res => history.push(res))

        // Get next response with retry for 429s
        let retryCount = 0
        let nextResponse: any = null
        while (retryCount < 3) {
          try {
            nextResponse = await openai.chat.completions.create({
              model: 'qwen-3-235b-a22b-instruct-2507',
              messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-15).map((m: any) => ({
                  role: m.role,
                  content: m.content || '',
                  tool_calls: m.tool_calls,
                  tool_call_id: m.tool_call_id,
                  name: m.name
                }))
              ]
            })
            break
          } catch (err: any) {
            if (err.status === 429 && retryCount < 2) {
              retryCount++
              await new Promise(r => setTimeout(r, 1000 * retryCount)) // Linear backoff
              continue
            }
            throw err
          }
        }
        if (!nextResponse) break;
        currentMessage = nextResponse.choices[0].message as any
      } else {
        break
      }
    }

    // Final Save and Return
    history.push(currentMessage)
    const finalChatId = await saveHistory(supabase, user.id, history, activeChatId)
    return NextResponse.json({ ...currentMessage, chatId: finalChatId })

  } catch (err: any) {
    console.error('API Error:', err)
    const status = err.status || 500
    const message = err.status === 429 
      ? "Wait, the AI engine is a bit busy! (429 Rate Limit). Please try again in 5 seconds." 
      : err.message
    return NextResponse.json({ error: message }, { status })
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
