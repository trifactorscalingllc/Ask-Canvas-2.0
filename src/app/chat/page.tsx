'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ChatInterface, Message } from '@/components/chat-interface'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Menu, Plus, MessageSquare } from 'lucide-react'

export default function ChatPage() {
  const [chats, setChats] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingToolCall, setPendingToolCall] = useState<any>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  
  const supabase = createClient()
  const router = useRouter()

  const fetchChats = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserEmail(session.user.email ?? undefined)
    const { data } = await supabase
      .from('chats')
      .select('id, messages, updated_at')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
    if (data) setChats(data)
  }

  useEffect(() => {
    fetchChats()
    
    // Listen for the global Navbar toggle signal
    const handleToggle = () => setIsSidebarOpen(prev => !prev)
    window.addEventListener('toggleSidebar', handleToggle)
    return () => window.removeEventListener('toggleSidebar', handleToggle)
  }, [])

  const selectChat = (id: string | null) => {
    setCurrentChatId(id)
    if (!id) {
      setMessages([])
    } else {
      const selected = chats.find(c => c.id === id)
      if (selected) {
        const loaded = (selected.messages as any[])
          .filter(m => m.role === 'user' || (m.role === 'assistant' && !!m.content))
          .map((m, i) => ({
            id: `msg-${i}`,
            role: m.role,
            content: m.content || ''
          }))
        setMessages(loaded)
      }
    }
    setIsSidebarOpen(false)
  }

  const sendMessage = async (e?: React.FormEvent, customPayload?: any) => {
    e?.preventDefault()
    
    if (!input.trim() && !customPayload) return

    let payloadToSend: any = { messages: [], chatId: currentChatId }
    
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

      if (!res.ok || data.error) {
        throw new Error(data.error || 'The server responded with a fatal error.')
      }

      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId)
        fetchChats() // Refresh the sidebar
      }

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

    } catch (err: any) {
      console.error(err)
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `🚨 **API Error:** ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!pendingToolCall) return
    const customPayload = {
      pendingToolCall: pendingToolCall.toolCall,
      chatId: currentChatId,
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

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-100 flex flex-row relative overflow-hidden animate-in fade-in duration-500">
      
      {/* Sidebar Drawer */}
      <div className={`absolute lg:static top-0 left-0 bg-white shadow-2xl lg:shadow-none border-r ${isSidebarOpen ? 'border-gray-200' : 'border-transparent'} h-full z-40 transition-all duration-500 ease-out ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'} overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-100 min-w-72">
          <button onClick={() => selectChat(null)} className="w-full flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm shadow-md shadow-blue-600/20">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-w-72">
          <div className="space-y-1.5">
            {chats.map((chat) => {
              // Extract the first user message safely (or default string)
              const firstMsg = (chat.messages || []).find((m: any) => m.role === 'user')?.content || 'New Conversation';
              return (
                <button 
                  key={chat.id} 
                  onClick={() => selectChat(chat.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 border ${currentChatId === chat.id ? 'bg-blue-50/80 border-blue-100 shadow-sm' : 'hover:bg-gray-50 border-transparent hover:border-gray-200'}`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shadow-sm border ${currentChatId === chat.id ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
                     <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden flex-1 overflow-ellipsis">
                    <div className={`text-sm font-medium w-full whitespace-nowrap overflow-hidden text-ellipsis ${currentChatId === chat.id ? 'text-blue-900' : 'text-gray-700'}`}>
                      {firstMsg}
                    </div>
                    <div className={`text-[11px] mt-1 ${currentChatId === chat.id ? 'text-blue-600/70' : 'text-gray-400'}`}>
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {pendingToolCall && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-white p-5 rounded-2xl shadow-2xl shadow-gray-300/60 border border-yellow-300 w-[90%] max-w-md animate-in slide-in-from-top-4">
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">

        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          userEmail={userEmail}
        />
      </div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 z-30 lg:hidden animate-in fade-in duration-500"
        />
      )}
    </div>
  )
}
