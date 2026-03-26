'use client'

import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Send, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { submitFeedback } from '@/app/actions/feedback';
import { MermaidVisual, FileEmbed } from './chat-visuals';
import { MermaidDiagram } from './generative-ui/MermaidDiagram';
import { SmartView } from './generative-ui/SmartView';
import LandingDashboard from './LandingDashboard';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolInvocations?: any[];
  tool_calls?: any[];
  audit?: {
    score: number;
    description: string;
    improvement: string;
  };
}

interface ChatInterfaceProps {
  currentChatId: string | null;
  userName?: string;
  userAvatar?: string;
  onFinish?: () => void;
}

// ── AI message bubble ───────────────────────────────────────────────────────
function AssistantBubble({ message, isLast, isStreaming, onFeedback, feedbackState, allMessages, currentIndex }: {
  message: Message;
  isLast: boolean;
  isStreaming?: boolean;
  onFeedback: (id: string, q: string, r: string, helpful: boolean) => void;
  feedbackState: Record<string, 'up' | 'down'>;
  allMessages: Message[];
  currentIndex: number;
}) {
  const renderGenerativeUI = () => {
    const invocations = message.toolInvocations || [];
    if (invocations.length === 0 && message.tool_calls) {
      return message.tool_calls.map((tc, idx) => {
        const name = tc.function?.name;
        const args = JSON.parse(tc.function?.arguments || '{}');
        return renderComponent(name, args, 'result', idx);
      });
    }
    return invocations.map((ti, idx) => {
      return renderComponent(ti.toolName, ti.args, ti.state, idx, ti.result);
    });
  };

  const renderComponent = (name: string, args: any, state: string, idx: number, result?: any) => {
    if (state === 'call') {
      const loadingText = name === 'render_smart_view' ? "Drawing interactive charts..." : "Generating Academic Asset...";
      return (
        <div key={idx} className="my-6 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-dashed border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{loadingText}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Retrieving Canvas Intelligence</p>
          </div>
        </div>
      );
    }
    try {
      if (name === 'render_smart_view') {
        const viewType = args.viewType;
        let dashboardData = null;
        for (let i = currentIndex; i >= 0; i--) {
          const prevMsg = allMessages[i];
          const contextInvocation = prevMsg.toolInvocations?.find(
            (ti: any) => ti.toolName === 'get_full_academic_context' && ti.state === 'result'
          );
          if (contextInvocation?.result) {
            dashboardData = contextInvocation.result;
            break;
          }
        }
        return <SmartView key={idx} viewType={viewType} data={dashboardData} />;
      }
      return null;
    } catch (err) {
      return (
        <div key={idx} className="my-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400">Failed to load dashboard data.</span>
        </div>
      );
    }
  };

  return (
    <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-left-3 duration-400">
      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden border-2 border-blue-100 shadow-sm mt-1 bg-white">
        <img src="/agent-avatar.png" alt="Agent" className="w-full h-full object-cover scale-[1.3] object-top" />
      </div>
      <div className="max-w-[90%] md:max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm px-6 py-4 shadow-sm relative mr-4 group">
        <div className="prose prose-blue prose-sm dark:prose-invert max-w-none overflow-x-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              table: ({ children }) => (
                <div className="relative w-full max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm my-6 bg-white dark:bg-gray-900 custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 font-sans text-left text-sm">{children}</table>
                </div>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white !no-underline rounded-lg text-xs font-semibold shadow-sm my-1">
                  {children}<ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
          {renderGenerativeUI()}
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-middle rounded-full" />}
        </div>
        {isLast && !isStreaming && (
          <div className="flex items-center space-x-2 pt-2 mt-2 border-t border-gray-200/50 justify-end opacity-80">
            <button onClick={() => onFeedback(message.id, '', message.content, true)} className={`p-1.5 rounded-md ${feedbackState[message.id] === 'up' ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}><ThumbsUp className="w-3.5 h-3.5" /></button>
            <button onClick={() => onFeedback(message.id, '', message.content, false)} className={`p-1.5 rounded-md ${feedbackState[message.id] === 'down' ? 'text-red-500 bg-red-100' : 'text-gray-400'}`}><ThumbsDown className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

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

function cleanContent(raw: string): string {
  return raw
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<tool_response>[\s\S]*?<\/tool_response>/g, '')
    .replace(/\[INTERNAL\][\s\S]*?(\n|$)/g, '')
    .replace(/\u200B/g, '')
    .trim()
}

function MessageFeed({ messages, isLoading, handleFeedback, feedbackState, userAvatar, allMessages }: any) {
  return (
    <div className="flex flex-col space-y-6 pb-24 text-gray-900 dark:text-gray-100">
      {messages.map((message: any, index: number) => {
        const isLast = index === messages.length - 1;
        if (message.role === 'assistant') {
          const cleaned = cleanContent(message.content);
          if (!cleaned && !message.toolInvocations) return null;
          return <AssistantBubble key={message.id} message={{ ...message, content: cleaned }} isLast={isLast} isStreaming={isLast && isLoading} onFeedback={handleFeedback} feedbackState={feedbackState} allMessages={allMessages} currentIndex={index} />;
        }
        return (
          <div key={message.id} className="flex justify-end gap-3 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="max-w-[80%] md:max-w-[72%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-5 py-3.5 shadow-md shadow-blue-500/10">
              <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">{message.content}</p>
            </div>
            {userAvatar && (
              <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden shadow-sm mt-1 bg-white border border-gray-100 ring-2 ring-blue-500/10">
                <img src={userAvatar} alt="You" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        );
      })}
      {isLoading && <ThinkingBubble />}
    </div>
  );
}

export function ChatInterface({ currentChatId, userName, userAvatar, onFinish }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    body: { chatId: currentChatId, userName: userName || 'Student' },
    onError: (err: any) => console.error("[useChat DIAGNOSTIC ERROR]:", err),
    onFinish: (message: any) => {
      console.log("[useChat DIAGNOSTIC FINISH]:", message);
      if (onFinish) onFinish();
    },
    onResponse: (res: any) => console.log("[useChat DIAGNOSTIC RESPONSE CODE]:", res.status)
  } as any) as any;

  const handleFeedback = async (messageId: string, query: string, response: string, isHelpful: boolean) => {
    setFeedbackState(prev => ({ ...prev, [messageId]: isHelpful ? 'up' : 'down' }));
    await submitFeedback(query, response, isHelpful);
  };

  // 🛡️ FORM SUBMISSION INTERCEPTOR
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("[DOM EVENT] Submit triggered. Target:", e.currentTarget.tagName);
    console.log("[DOM EVENT] Current input state:", input);
    
    if (!input || input.trim() === '') {
      console.warn("[DOM EVENT] Aborted: Input is blank or empty.");
      return;
    }
    
    console.log("[DOM EVENT] Handing off to AI SDK handleSubmit...");
    handleSubmit(e);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-gray-50 dark:bg-gray-900 mx-auto w-full border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900 min-h-0 custom-scrollbar scroll-smooth">
        <div className="w-[90%] md:w-[75%] mx-auto">
          {messages.length === 0 ? (
            <LandingDashboard userName={userName} onQuickPrompt={(text) => append({ role: 'user', content: text })} />
          ) : (
            <div className="flex-1 py-4">
              <MessageFeed messages={messages} isLoading={isLoading} handleFeedback={handleFeedback} feedbackState={feedbackState} userAvatar={userAvatar} allMessages={messages} />
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 shrink-0 shadow-sm relative z-20">
        <form onSubmit={handleFormSubmit} className="flex items-center space-x-3 w-[90%] md:w-[75%] mx-auto">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            autoFocus
            placeholder="Ask about your Canvas data..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full p-3.5 flex items-center justify-center transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
