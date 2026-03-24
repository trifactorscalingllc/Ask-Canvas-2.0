import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { submitFeedback } from '@/app/actions/feedback';
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});

  const handleFeedback = async (messageId: string, query: string, response: string, isHelpful: boolean) => {
    setFeedbackState(prev => ({ ...prev, [messageId]: isHelpful ? 'up' : 'down' }));
    await submitFeedback(query, response, isHelpful);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-gray-50 mx-auto w-full border border-gray-200 shadow-sm rounded-xl overflow-hidden font-sans">
      {/* Loading Banner */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center mt-4 transition-all">
          <div className="bg-blue-600 text-white px-5 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse flex items-center space-x-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span>Checking Canvas...</span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-3">
            <div className="w-16 h-16 bg-blue-50 flex items-center justify-center rounded-2xl mb-2">
              <img src="/canvas-logo.svg" alt="Canvas" className="w-10 h-10 object-contain mix-blend-multiply opacity-50" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Ask Canvas 2.0</h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Your AI teaching assistant. Ask me about your grades, assignments, schedules, or courses.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] px-5 py-3.5 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                    : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm prose prose-blue prose-sm shadow-sm'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="flex flex-col space-y-1">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    {index === messages.length - 1 && (
                      <div className="flex items-center space-x-2 pt-1 mt-2 border-t border-gray-200/50 justify-end opacity-80">
                        <button 
                          onClick={() => handleFeedback(message.id, messages[index - 1]?.content || 'N/A', message.content, true)}
                          disabled={feedbackState[message.id] !== undefined}
                          className={`p-1.5 rounded-md transition-all ${feedbackState[message.id] === 'up' ? 'text-blue-600 bg-blue-100 scale-110' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleFeedback(message.id, messages[index - 1]?.content || 'N/A', message.content, false)}
                          disabled={feedbackState[message.id] !== undefined}
                          className={`p-1.5 rounded-md transition-all ${feedbackState[message.id] === 'down' ? 'text-red-500 bg-red-100 scale-110' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
                          title="Not Helpful"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-sm relative z-20">
        <form
          onSubmit={sendMessage}
          className="flex items-center space-x-3 w-[75%] mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about your Canvas data..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 transition-all text-[15px] text-gray-800 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3.5 flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md active:scale-95"
          >
            <Send className="w-5 h-5 -ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
