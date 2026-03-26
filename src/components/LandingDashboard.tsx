'use client';

import React from 'react';
import { Calendar, AlertCircle, Clock, ChevronRight, Sparkles } from 'lucide-react';

interface LandingDashboardProps {
  onQuickPrompt: (text: string) => void;
  userName?: string;
}

export function LandingDashboard({ onQuickPrompt, userName }: LandingDashboardProps) {
  const firstName = userName ? userName.split(' ')[0] : 'there';
  
  const cards = [
    {
      title: 'Upcoming',
      subtitle: 'What is due next?',
      description: 'Check your upcoming deadlines for the next 3 weeks.',
      icon: <Clock className="w-6 h-6 text-blue-500" />,
      prompt: 'Show me my upcoming assignments for the next 3 weeks.',
      color: 'blue'
    },
    {
      title: 'Overdue',
      subtitle: 'Any missed work?',
      description: 'Find assignments that have passed their due date.',
      icon: <AlertCircle className="w-6 h-6 text-red-500" />,
      prompt: 'Do I have any overdue assignments?',
      color: 'red'
    },
    {
      title: 'Calendar',
      subtitle: 'Plan your week',
      description: 'See your schedule and manage your time effectively.',
      icon: <Calendar className="w-6 h-6 text-indigo-500" />,
      prompt: 'Show me my class schedule for the rest of the week.',
      color: 'indigo'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-full text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
          <Sparkles className="w-3 h-3" />
          Academic Intelligence v2.0
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
          Welcome back, <span className="text-blue-600">{firstName}</span>.
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm leading-relaxed font-medium">
          Your Canvas data is synced and ready. What can I help you accomplish today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {cards.map((card, idx) => (
          <button
            key={idx}
            onClick={() => onQuickPrompt(card.prompt)}
            className="group relative flex flex-col p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500 text-left overflow-hidden hover:-translate-y-2"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-${card.color}-500/10 transition-colors`} />
            
            <div className={`w-12 h-12 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
              {card.icon}
            </div>
            
            <div className="space-y-1 mb-4 relative z-10">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.subtitle}</h3>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{card.title}</h2>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
              {card.description}
            </p>
            
            <div className="mt-auto flex items-center gap-2 font-bold text-[11px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
              Quick Query
              <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </div>
            
            {/* Corner decorator */}
            <div className="absolute bottom-4 right-4 text-gray-100 dark:text-gray-800 transition-colors group-hover:text-blue-500/20 pointer-events-none">
              {card.icon}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-black mb-4">Popular Actions</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "Check my grades",
            "What do I have tomorrow?",
            "Summarize my week",
            "Grade progression graph"
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => onQuickPrompt(action)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 transition-all active:scale-95"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
