import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 p-8 sm:p-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Privacy Policy</h1>
        
        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">1. Data Collection</h2>
            <p>At Ask Canvas 2.0, we believe in minimizing our digital footprint. We only collect the data strictly necessary to provide you with your AI teaching assistant: your Email, Name, and Canvas API Token.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">2. Data Usage</h2>
            <p>We use your Canvas API Token <strong>solely</strong> to fetch your academic data (grades, courses, assignments) on your behalf in real-time. We absolutely do not sell, rent, or share your academic data or credentials with any third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">3. FERPA & Academic Records</h2>
            <p>Ask Canvas 2.0 is designed with student privacy and FERPA compliance in mind. We do not store your academic records permanently. Data is fetched in real-time from Canvas, parsed to answer your specific prompts, and cached only briefly for the duration of your session context.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">4. User Control</h2>
            <p>You have full autonomy over your data. You may delete your account, your chat history, and all associated encrypted data instantly at any time from your account settings.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
