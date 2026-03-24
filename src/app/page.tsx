'use client'

import { useState, useEffect } from 'react'
import { ChatInterface, Message } from '@/components/chat-interface'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingToolCall, setPendingToolCall] = useState<any>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadHistory() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('chats')
        .select('messages')
        .eq('user_id', session.user.id)
        .single()

      if (data && data.messages) {
        const loaded = (data.messages as any[])
          .filter(m => m.role === 'user' || (m.role === 'assistant' && !!m.content))
          .map((m, i) => ({
            id: `msg-${i}`,
            role: m.role,
            content: m.content || ''
          }))
        setMessages(loaded)
      }
    }
    loadHistory()
  }, [])

  const sendMessage = async (e?: React.FormEvent, customPayload?: any) => {
    e?.preventDefault()
    
    if (!input.trim() && !customPayload) return

    let payloadToSend: any = { messages: [] }
    
    if (!customPayload) {
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
      setMessages(prev => [...prev, userMsg])
      payloadToSend.messages = [userMsg]
      setInput('')
    } else {
      payloadToSend = customPayload
    }

    setIsLoading(true)
    setPendingToolCall(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend)
      })

      const data = await res.json()

      if (data.status === 'requires_confirmation') {
        setPendingToolCall(data)
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Confirmation Required:** I am about to execute \`${data.functionName}\` with the following arguments:\n\n\`\`\`json\n${JSON.stringify(data.arguments, null, 2)}\n\`\`\``
        }])
      } else if (data.content) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.content
        }])
      }

    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'An error occurred while connecting to the engine.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!pendingToolCall) return
    const customPayload = {
      pendingToolCall: pendingToolCall.toolCall,
      toolResult: {
        role: 'tool',
        tool_call_id: pendingToolCall.toolCall.id,
        name: pendingToolCall.functionName,
        content: `{"status": "success", "message": "Action ${pendingToolCall.functionName} confirmed by user"}`
      }
    }
    await sendMessage(undefined, customPayload)
  }

  const handleCancelAction = () => {
    setPendingToolCall(null)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Action cancelled.'
    }])
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col relative">
      <div className="absolute top-4 right-4 z-50">
        <button onClick={handleSignOut} className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-full shadow-md hover:bg-gray-50 border border-gray-200 transition-colors">
          Sign out
        </button>
      </div>

      {pendingToolCall && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white p-5 rounded-2xl shadow-xl shadow-gray-200/50 border border-yellow-300 w-[90%] max-w-md animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <h3 className="font-bold text-gray-900">Confirm Action</h3>
          </div>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{pendingToolCall.message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={handleCancelAction} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={handleConfirmAction} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors shadow-blue-600/20">Execute</button>
          </div>
        </div>
      )}
      
      <ChatInterface
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}
