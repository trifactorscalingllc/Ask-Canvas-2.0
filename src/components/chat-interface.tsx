'use client'

import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Send, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { submitFeedback } from '@/app/actions/feedback';
import { MermaidVisual, FileEmbed } from './chat-visuals';

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
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

// (Fake typing animation removed — real streaming replaces it)

// ── AI message bubble ───────────────────────────────────────────────────────
function AssistantBubble({ message, isLast, isStreaming, onFeedback, feedbackState }: {
  message: Message;
  isLast: boolean;
  isStreaming?: boolean;  // true while this message is still being streamed
  onFeedback: (id: string, q: string, r: string, helpful: boolean) => void;
  feedbackState: Record<string, 'up' | 'down'>;
}) {
  return (
    <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-left-3 duration-400">
      {/* Robot Avatar */}
      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden border-2 border-blue-100 shadow-sm mt-1 bg-white">
        <img src="/agent-avatar.png" alt="Agent" className="w-full h-full object-cover scale-[1.3] object-top" />
      </div>
      <div className="max-w-[90%] md:max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm px-6 py-4 shadow-sm relative mr-4">
        <div className="prose prose-blue prose-sm dark:prose-invert max-w-none overflow-x-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '')
                const value = String(children).replace(/\n$/, '')

                // Only render Mermaid once stream is done — prevents freeze/glitch
                if (match && match[1] === 'mermaid') {
                  if (isStreaming) {
                    return (
                      <div className="p-4 my-3 bg-gray-900/5 rounded-xl border border-dashed border-blue-200 dark:border-blue-900 flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <span className="text-xs font-medium text-blue-400">Preparing diagram...</span>
                      </div>
                    )
                  }
                  return <MermaidVisual chart={value} />
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              a: ({ href, children }) => {
                if (href?.startsWith('embed:')) {
                  const actualUrl = href.replace('embed:', '')
                  return <FileEmbed url={actualUrl} title={String(children)} type="pdf" />
                }
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white !no-underline rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-sm my-1"
                  >
                    {children}
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                )
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
          {/* Live stream cursor */}
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-middle rounded-full" />}
        </div>
        {isLast && !isStreaming && (
          <div className="flex items-center space-x-2 pt-2 mt-2 border-t border-gray-200/50 dark:border-gray-700 justify-end opacity-80">
            <button
              onClick={() => onFeedback(message.id, '', message.content, true)}
              disabled={feedbackState[message.id] !== undefined}
              className={`p-1.5 rounded-md transition-all hover:scale-110 active:scale-95 ${feedbackState[message.id] === 'up' ? 'text-blue-600 bg-blue-100 scale-110' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFeedback(message.id, '', message.content, false)}
              disabled={feedbackState[message.id] !== undefined}
              className={`p-1.5 rounded-md transition-all hover:scale-110 active:scale-95 ${feedbackState[message.id] === 'down' ? 'text-red-500 bg-red-100 scale-110' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
              title="Not Helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thinking dots animation ──────────────────────────────────────────────────
function ThinkingBubble() {
  return (
    <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-left-3 duration-300">
      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden border-2 border-blue-100 shadow-sm mt-1 bg-white">
        <img src="/agent-avatar.png" alt="Agent thinking" className="w-full h-full object-cover scale-[1.3] object-top" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ── Welcome screen ───────────────────────────────────────────────────────────
function WelcomeScreen({ userEmail }: { userEmail?: string }) {
  const firstName = userEmail ? userEmail.split('@')[0].split('.')[0] : null;
  const greeting = firstName
    ? `Hey ${firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋`
    : 'Welcome back 👋';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-5 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-20 h-20 rounded-2xl overflow-hidden">
        <img src="/agent-avatar.png" alt="Ask Canvas Agent" className="w-full h-full object-cover" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">{greeting}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm leading-relaxed">
          I&apos;m your Ask Canvas AI agent. Ask me anything about your courses, grades, assignments, or upcoming deadlines.
        </p>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
/** Strip residual <tool_call>/<tool_response> XML the model may have emitted */
function cleanContent(raw: string): string {
  return raw
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<tool_response>[\s\S]*?<\/tool_response>/g, '')
    .trim()
}

export function ChatInterface({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  userEmail,
  userName,
  userAvatar
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [seenIds] = useState<Set<string>>(new Set());

  const handleFeedback = async (messageId: string, query: string, response: string, isHelpful: boolean) => {
    setFeedbackState(prev => ({ ...prev, [messageId]: isHelpful ? 'up' : 'down' }));
    await submitFeedback(query, response, isHelpful);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-gray-50 dark:bg-gray-900 mx-auto w-full border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl overflow-hidden font-sans">

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900 min-h-0">
        <div className="w-[90%] md:w-[75%] mx-auto space-y-5">
          {messages.length === 0 ? (
            <AssistantBubble
              message={{
                id: 'welcome',
                role: 'assistant',
                content: userName
                  ? `Hey ${userName} 👋\n\nI'm your **Ask Canvas** AI agent. Ask me anything about your courses, grades, assignments, or upcoming deadlines.`
                  : `Welcome back 👋\n\nI'm your **Ask Canvas** AI agent. Ask me anything about your courses, grades, assignments, or upcoming deadlines.`
              }}
              isLast={false}
              onFeedback={() => { }}
              feedbackState={{}}
            />
          ) : (
            messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              if (message.role === 'assistant') {
                const cleaned = cleanContent(message.content);
                // Skip intermediate tool-call setup messages that have no displayable text
                if (!cleaned) return null;
                return (
                  <AssistantBubble
                    key={message.id}
                    message={{ ...message, content: cleaned }}
                    isLast={isLast}
                    isStreaming={isLast && isLoading}
                    onFeedback={handleFeedback}
                    feedbackState={feedbackState}
                  />
                );
              }
              return (
                <div key={message.id} className="flex justify-end gap-3 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="max-w-[80%] md:max-w-[72%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-5 py-3.5 shadow-md">
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
                  </div>
                  {userAvatar && (
                    <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden shadow-sm mt-1 bg-white">
                      <img src={userAvatar} alt="You" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Thinking dots while loading */}
          {isLoading && <ThinkingBubble />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 shrink-0 shadow-sm relative z-20">
        <form onSubmit={sendMessage} className="flex items-center space-x-3 w-[90%] md:w-[75%] mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about your Canvas data..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 transition-all text-[15px]"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 active:scale-90 text-white rounded-full p-3.5 flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-blue-500/30 hover:scale-105"
          >
            <Send className="w-5 h-5 -ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
