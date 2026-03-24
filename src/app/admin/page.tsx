import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutoRefresh } from '@/components/auto-refresh'
import { markAsResolved } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'admin@trifactorscaling.com') {
    redirect('/')
  }

  const { data: proposedTools } = await (supabase as any)
    .from('proposed_tools')
    .select('id, requested_feature, status, created_at, user_id')
    .order('created_at', { ascending: false })

  const { data: feedback } = await (supabase as any)
    .from('feedback')
    .select('id, query, response, is_helpful, created_at')
    .order('created_at', { ascending: false })

  const totalTools = proposedTools?.length || 0
  const totalFeedback = feedback?.length || 0
  const positiveFeedback = feedback?.filter((f: any) => f.is_helpful)?.length || 0
  const positivePercent = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans pb-20">
      <AutoRefresh interval={5000} />
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard & God Mode</h1>
          <a href="/" className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">Return to Chat</a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Proposed Tools</h3>
            <p className="text-4xl font-extrabold text-blue-600">{totalTools}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Positive Feedback %</h3>
            <p className="text-4xl font-extrabold text-green-600">{positivePercent}% <span className="text-sm font-normal text-gray-400">({positiveFeedback}/{totalFeedback})</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feature Requests Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Feature Requests Feed</h2>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
            </div>
            <div className="p-0 overflow-y-auto customize-scrollbar divide-y divide-gray-100">
              {proposedTools?.map((tool: any) => (
                <div key={tool.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded truncate max-w-[150px]" title={tool.user_id}>{tool.user_id}</span>
                    <form action={markAsResolved}>
                      <input type="hidden" name="id" value={tool.id} />
                      <button 
                        type="submit"
                        disabled={tool.status === 'resolved'}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${tool.status === 'resolved' ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'}`}
                      >
                        {tool.status === 'resolved' ? 'Resolved' : 'Mark Resolved'}
                      </button>
                    </form>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed">{tool.requested_feature}</p>
                </div>
              ))}
              {proposedTools?.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No feature requests yet.</div>}
            </div>
          </div>

          {/* Feedback Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Live Feedback Feed</h2>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            </div>
            <div className="p-0 overflow-y-auto customize-scrollbar divide-y divide-gray-100">
              {feedback?.map((fb: any) => (
                <div key={fb.id} className={`p-5 transition-colors ${fb.is_helpful === false ? 'bg-red-50 hover:bg-red-100/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${fb.is_helpful ? 'bg-green-100 text-green-700' : 'bg-red-200 text-red-800'}`}>
                      {fb.is_helpful ? 'Thumbs Up' : 'Thumbs Down'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono tracking-tighter">{new Date(fb.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Query</span>
                      <p className="text-sm text-gray-800 bg-white/50 p-2 rounded border border-gray-100 font-medium">{fb.query}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Response</span>
                      <p className="text-xs text-gray-600 line-clamp-3 bg-white/50 p-2 rounded border border-gray-100" title={fb.response}>{fb.response}</p>
                    </div>
                  </div>
                </div>
              ))}
              {feedback?.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No feedback logs yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
