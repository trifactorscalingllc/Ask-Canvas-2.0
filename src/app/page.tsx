'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, BookOpen, Sparkles, Clock, BarChart3, Shield, Zap } from 'lucide-react'

// ─── Hero Chat Animation Data ─────────────────────────────────────────────────
const heroMessages = [
  { type: 'user', content: 'Hey, what do I need to prepare for the Marketing seminar tomorrow?' },
  { type: 'ai', content: 'You should review the <strong class="text-blue-600">Case Study: Digital Transformation</strong>. Prof. Smith also posted an announcement 2hrs ago about a short pre-lab quiz.' },
  { type: 'user', content: 'Wait, a quiz? Can you generate a quick study guide for it?' },
  { type: 'ai', content: null, guide: ['Market Segmentation Strategies', 'Customer Lifetime Value (CLV)', 'Omni-channel Attribution'] },
  { type: 'user', content: 'What about my CS lab assignment?' },
  { type: 'ai', content: 'Your <strong class="text-blue-600">CS-202: Data Structures</strong> lab is due in 3 days. I noticed you haven\'t started the "Balanced Trees" section yet. Need a refresher?' },
]

// ─── Scenarios (Brand Animation Section) ──────────────────────────────────────
const scenarios = [
  { user: 'When is my next quiz?', ai: 'Your <strong class="text-blue-600">CS-101 Quiz 3</strong> is this Friday at 10:00 AM in Room 402.' },
  { user: 'Summarize Chapter 5 for me.', ai: 'Chapter 5 covers <strong class="text-blue-600">Neural Networks</strong>. Key concepts include backpropagation, activation functions, and gradient descent...' },
  { user: "What's my current grade in Bio?", ai: 'Your current grade in <strong class="text-blue-600">Biology 101</strong> is <strong>88.5% (A-)</strong>, following your recent lab report score.' },
]

export default function LandingPage() {
  const chatRef = useRef<HTMLDivElement>(null)
  const [chatMessages, setChatMessages] = useState(heroMessages.slice(0, 4))
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [scenarioVisible, setScenarioVisible] = useState(true)
  const workflowRef = useRef<HTMLElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)

  // Scroll-driven workflow line
  useEffect(() => {
    const onScroll = () => {
      const section = workflowRef.current
      const line = lineRef.current
      if (!section || !line) return
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const start = vh * 0.7
      const end = vh * 0.3
      const progress = Math.max(0, Math.min(1, (vh - rect.top - start) / (rect.height + vh - start - end)))
      line.style.width = `${progress * 100}%`
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scenario cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setScenarioVisible(false)
      setTimeout(() => {
        setScenarioIndex(prev => (prev + 1) % scenarios.length)
        setScenarioVisible(true)
      }, 500)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const scenario = scenarios[scenarioIndex]

  return (
    <div className="font-sans antialiased bg-[#f9f9ff] text-[#151c27]">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        className="relative pt-36 pb-24 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at top right, #dbe1ff 0%, transparent 40%), radial-gradient(circle at bottom left, #f0f3ff 0%, transparent 40%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-[90%] mx-auto flex flex-col lg:flex-row items-center gap-16">
            {/* Left copy */}
            <div className="lg:w-1/2 space-y-8">
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#151c27]">
                Your Personal{' '}
                <span className="text-[#004ac6]">Canvas</span>
                {' '}LMS Agent
              </h1>
              <p className="text-xl text-[#434655] leading-relaxed max-w-xl">
                Seamlessly sync your courses and master your curriculum with an AI assistant that understands your academic context.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/signup"
                  className="px-10 py-4 rounded-xl font-bold text-lg text-white shadow-xl hover:opacity-90 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)' }}
                >
                  Start Learning
                </Link>
                <Link
                  href="/login"
                  className="px-10 py-4 rounded-xl font-bold text-lg text-[#004ac6] bg-white border-2 border-[#dbe1ff] hover:border-[#004ac6] transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Right – Chat bubble animation */}
            <div className="lg:w-1/2 w-full">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#004ac6] to-[#2563eb] rounded-3xl blur opacity-20 group-hover:opacity-30 transition" />
                <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-slate-200 flex flex-col" style={{ height: 500 }}>
                  {/* Header bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#004ac6]" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Academic AI Agent</p>
                        <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                          Connected to Canvas
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Messages */}
                  <div ref={chatRef} className="flex-1 space-y-4 overflow-y-auto pr-1 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start gap-3'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                        style={{ animationDelay: `${i * 0.4}s` }}
                      >
                        {msg.type === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-[#004ac6]" />
                          </div>
                        )}
                        {msg.guide ? (
                          <div className="bg-slate-50 text-slate-700 p-3 px-4 rounded-2xl rounded-tl-none max-w-[85%] border border-slate-100 text-sm">
                            I've extracted the core concepts from the reading.
                            <div className="p-2 bg-white rounded-lg border border-slate-200 mt-2 space-y-1">
                              <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Generated Guide</p>
                              {msg.guide.map((g, gi) => <p key={gi} className="text-xs">{`${gi + 1}. ${g}`}</p>)}
                            </div>
                          </div>
                        ) : msg.type === 'user' ? (
                          <div className="bg-[#004ac6] text-white p-3 px-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-md text-sm">
                            {msg.content}
                          </div>
                        ) : (
                          <div
                            className="bg-slate-50 text-slate-700 p-3 px-4 rounded-2xl rounded-tl-none max-w-[85%] border border-slate-100 text-sm"
                            dangerouslySetInnerHTML={{ __html: msg.content! }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Input mock */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                    <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-slate-400 text-sm flex items-center justify-between">
                      Summarize Chapter 5...
                    </div>
                    <div className="w-12 h-12 bg-[#004ac6] rounded-xl flex items-center justify-center text-white cursor-pointer hover:bg-[#2563eb] transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand Animation / Scenario Section ────────────────────────── */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-slate-900">Never Lose Track Again</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">Stay on top of your schedule with instant context-aware answers.</p>
          </div>
          <div className="flex justify-center mb-20">
            <div className="text-6xl md:text-7xl font-black text-[#004ac6] tracking-tighter" style={{ animation: 'brandPulse 3s infinite ease-in-out' }}>
              Just AskCanvas
            </div>
          </div>

          {/* Scenario cycling card */}
          <div className="relative min-h-[360px] flex justify-center items-center">
            <div
              className="w-full max-w-3xl space-y-6 flex flex-col items-center px-4 transition-all duration-500"
              style={{ opacity: scenarioVisible ? 1 : 0, transform: scenarioVisible ? 'translateY(0)' : 'translateY(10px)' }}
            >
              <div className="w-full flex justify-end">
                <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-5 max-w-md -rotate-1">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <p className="text-lg font-medium text-slate-800 italic">&ldquo;{scenario.user}&rdquo;</p>
                  </div>
                </div>
              </div>
              <div className="w-full flex justify-start">
                <div className="bg-white border-2 border-blue-100 shadow-2xl rounded-3xl p-6 max-w-lg rotate-1 relative">
                  <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-[#004ac6] flex items-center justify-center text-white shadow-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className="text-lg text-slate-700 leading-relaxed pl-4" dangerouslySetInnerHTML={{ __html: scenario.ai }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────────── */}
      <section className="py-32 bg-[#f9f9ff]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Everything you need to master your courses</h2>
            <p className="text-xl text-[#434655] max-w-3xl mx-auto">Advanced tools designed to simplify your academic life and maximize your learning potential.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {[
              { icon: <BookOpen className="w-8 h-8" />, title: 'Smart Course Indexing', desc: 'Automatically organizes your lecture notes, assignments, and files into a searchable, structured knowledge base.' },
              { icon: <Sparkles className="w-8 h-8" />, title: 'AI-Powered Study Guides', desc: 'Generates personalized summaries and practice quizzes based on your specific curriculum and current lecture topics.' },
              { icon: <Clock className="w-8 h-8" />, title: '24/7 Academic Assistant', desc: "Answers questions instantly with deep context from your school's LMS, saving you hours of manual searching." },
              { icon: <BarChart3 className="w-8 h-8" />, title: 'Performance Analytics', desc: 'Tracks your learning progress, identifies areas for improvement, and suggests focus points for your next study session.' },
            ].map((f, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-[#f0f3ff] border border-[#c3c6d7]/20 hover:bg-white hover:shadow-2xl transition-all duration-300">
                <div className="flex gap-6 items-start">
                  <div className="w-16 h-16 rounded-2xl bg-[#004ac6]/10 flex items-center justify-center text-[#004ac6] shrink-0">
                    {f.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">{f.title}</h3>
                    <p className="text-[#434655] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────────────────── */}
      <section ref={workflowRef} className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Streamline Your Academic Workflow</h2>
            <p className="text-[#434655] text-lg max-w-2xl mx-auto">From setup to mastery in three simple steps.</p>
          </div>
          <div className="relative">
            {/* Desktop progress line */}
            <div className="hidden lg:block absolute top-[48px] left-[10%] right-[10%] h-[3px] bg-slate-100 z-0">
              <div ref={lineRef} className="h-full w-0 transition-all duration-150" style={{ background: 'linear-gradient(to right, #004ac6, #2563eb)', boxShadow: '0 0 15px rgba(0,74,198,0.3)' }} />
            </div>
            <div className="grid lg:grid-cols-3 gap-12 lg:gap-24 relative">
              {[
                { step: '01', Icon: Zap, title: 'Sync Canvas', desc: 'One-click integration with your school\'s LMS. We securely index your assignments, files, and announcements.' },
                { step: '02', Icon: Sparkles, title: 'Ask Anything', desc: 'Question your curriculum. From "When is the next quiz?" to "Explain chapter 4 using my lecture notes."' },
                { step: '03', Icon: BarChart3, title: 'Learn Faster', desc: 'Optimize your study sessions with personalized summaries and automated study guides tailored to you.' },
              ].map(({ step, Icon, title, desc }) => (
                <div key={step} className="flex flex-col items-center text-center space-y-8">
                  <div className="w-24 h-24 rounded-full bg-[#004ac6] flex items-center justify-center text-white shadow-lg">
                    <Icon className="w-10 h-10" />
                  </div>
                  <div className="space-y-4">
                    <span className="inline-block px-4 py-1 rounded-full bg-blue-50 text-[#004ac6] text-xs font-bold uppercase tracking-widest">Step {step}</span>
                    <h3 className="text-2xl font-bold">{title}</h3>
                    <p className="text-[#434655] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0f172a] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-[#1e293b]/50 rounded-2xl p-12 lg:p-20 relative overflow-hidden border border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#2563eb] opacity-10 blur-[100px] rounded-full" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-8">
                <h2 className="text-5xl font-extrabold tracking-tight leading-tight">Security First.<br/>Always.</h2>
                <p className="text-slate-400 text-lg leading-relaxed">We treat your academic data with the same rigor as financial institutions. Encrypted at rest and in transit — we never sell your data.</p>
                <ul className="space-y-4">
                  {['End-to-end AES-256 Encryption', 'FERPA & SOC2 Compliant Framework'].map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="text-[#2563eb] w-5 h-5 shrink-0" />
                      <span className="text-slate-300 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-6">
                  <Link href="/security" className="inline-flex items-center gap-2 text-white font-bold border-b-2 border-[#2563eb] pb-1 hover:text-[#2563eb] transition-colors group">
                    Read our Security Whitepaper
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
              <div className="lg:w-1/2 flex justify-center w-full">
                <div className="relative w-full max-w-md">
                  <div className="absolute inset-0 bg-[#2563eb]/20 blur-3xl rounded-full" />
                  <div className="relative bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-8 shadow-2xl">
                    <div className="w-full flex items-center justify-between mb-2">
                      <div className="flex gap-1.5">
                        {[0,1,2].map(d => <div key={d} className="w-2.5 h-2.5 rounded-full bg-slate-700" />)}
                      </div>
                      <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono">SECURE_NODE_01</div>
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-[#2563eb]/20 flex items-center justify-center border border-[#2563eb]/30">
                      <Shield className="w-10 h-10 text-[#2563eb]" />
                    </div>
                    <div className="space-y-4 w-full">
                      <div className="h-1.5 w-3/4 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-[#2563eb]/40" style={{ animation: 'slideInRight 2s ease infinite' }} />
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full" />
                      <div className="h-1.5 w-1/2 bg-white/10 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full pt-4">
                      <div className="h-12 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        <span className="text-[10px] text-white/60 font-bold tracking-widest uppercase">Encrypted</span>
                      </div>
                      <div className="h-12 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                        <span className="text-[10px] text-white/60 font-bold tracking-widest uppercase">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#f9f9ff]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
          <h2 className="text-5xl font-extrabold tracking-tight leading-tight">Ready to transform your<br/>academic life?</h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/signup"
              className="px-12 py-5 rounded-2xl font-bold text-xl text-white shadow-2xl hover:scale-105 transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)' }}
            >
              Start Learning
            </Link>
          </div>
          <p className="text-[#434655] text-sm font-medium">No credit card required · Connect your Canvas account in minutes</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-lg font-bold text-slate-900">Ask Canvas</span>
            <p className="text-sm text-slate-500 max-w-xs text-center md:text-left">© {new Date().getFullYear()} Ask Canvas. Academic Intelligence for the Modern Learner.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Security Whitepaper', href: '/security' },
              { label: 'Contact Support', href: 'mailto:support@askcanvas.com' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes brandPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
