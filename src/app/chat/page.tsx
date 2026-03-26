'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/chat-interface'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Menu, Plus, MessageSquare } from 'lucide-react'
import { useChat } from '@ai-sdk/react'

export default function ChatPage() {
  const [chats, setChats] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined)

  const supabase = createClient()
  const router = useRouter()

  // UseChat Hook Integration
  const { messages, input, setInput, handleSubmit, handleInputChange, isLoading, setMessages, append } = useChat({
    api: '/api/chat',
    body: { chatId: currentChatId },
    initialMessages: [],
    onResponse: (response: Response) => {
      // Handle custom headers if needed
    },
    onFinish: (message: any) => {
      // Save history in background
      fetchChats();
    }
  } as any) as any;

  const fetchChats = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserEmail(session.user.email ?? undefined)

    const [chatRes, userRes] = await Promise.all([
      supabase
        .from('chats')
        .select('id, messages, updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', session.user.id)
        .single()
    ])

    if (chatRes.data) setChats(chatRes.data)
    if (userRes.data) {
      if (userRes.data.name) setUserName(userRes.data.name.split(' ')[0])
      if (userRes.data.avatar_url) setUserAvatar(userRes.data.avatar_url)
    }
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
        setMessages(selected.messages || [])
      }
    }
    setIsSidebarOpen(false)
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-100 dark:bg-gray-950 flex flex-row relative overflow-hidden animate-in fade-in duration-500 font-sans">

      {/* Sidebar Drawer */}
      <div className={`absolute lg:static top-0 left-0 bg-white dark:bg-gray-900 shadow-2xl lg:shadow-none border-r ${isSidebarOpen ? 'border-gray-200 dark:border-gray-800' : 'border-transparent'} h-full z-40 transition-all duration-500 ease-out ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'} overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 min-w-72">
          <button onClick={() => selectChat(null)} className="w-full flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm shadow-md shadow-blue-600/20">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-w-72 dark:bg-gray-900">
          <div className="space-y-1.5">
            {chats.map((chat) => {
              const firstMsg = (chat.messages || []).find((m: any) => m.role === 'user')?.content || 'New Conversation';
              return (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 border ${currentChatId === chat.id
                    ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 shadow-sm'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shadow-sm border ${currentChatId === chat.id ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden flex-1 overflow-ellipsis">
                    <div className={`text-sm font-medium w-full whitespace-nowrap overflow-hidden text-ellipsis ${currentChatId === chat.id ? 'text-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}>
                      {firstMsg}
                    </div>
                    <div className={`text-[11px] mt-1 ${currentChatId === chat.id ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-gray-400 dark:text-gray-500'}`}>
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={handleSubmit}
          isLoading={isLoading}
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
          append={append}
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
