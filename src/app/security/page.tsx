import React from 'react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 p-8 sm:p-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Security Overview</h1>
        
        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">1. AES-256 Token Encryption</h2>
            <p>Your Canvas API tokens are <strong>never stored in plain text</strong>. Before your token ever hits our database, it is encrypted using industry-standard AES-256-CBC encryption with a unique, randomized Initialization Vector (IV). It is decrypted in memory exclusively when executing your active AI requests.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">2. Robust Infrastructure</h2>
            <p>We utilize <a href="https://supabase.com" className="text-blue-600 hover:underline">Supabase</a> (PostgreSQL) as our backend architecture. By enforcing strict Row Level Security (RLS) policies, all your data is mathematically locked behind your unique authenticated user ID. Even in the theoretical event of a database leak, your records stay compartmentalized and inaccessible to others.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">3. Human-in-the-Loop (Read-Only by Default)</h2>
            <p>Ask Canvas 2.0 acts identically to a read-only agent by default. While our engine supports complex POST tools—such as replying to discussions on your behalf—every single "write" action triggers a mandatory UI pause. We require explicit manual confirmation from you before we ever alter data within your Canvas account.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">4. No Permanent Logging</h2>
            <p>We only store your chat history to provide necessary conversational context to the LLM. We do not permanently log, aggregate, or train models on the specific contents of your grades or coursework.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
