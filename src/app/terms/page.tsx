export default function TermsPage() {
  return (
    <div className="flex-1 bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20 lg:py-24">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
          <p className="mt-4 text-lg text-gray-500">Ask Canvas 2.0 &bull; Last Updated: March 24, 2026</p>
        </div>

        <div className="prose prose-blue prose-lg text-gray-600 prose-headings:text-gray-900 max-w-none space-y-12">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Ask Canvas 2.0, a product of TriFactor Scaling LLC, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p>
              Ask Canvas 2.0 is an AI-powered interface designed to help students query their Canvas LMS data using natural language. We provide a simplified view of your academic data; we do not replace the official Canvas LMS provided by your institution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>API Tokens:</strong> You are solely responsible for generating and maintaining the security of your Canvas API Token.</li>
              <li><strong>Account Security:</strong> You are responsible for all activity that occurs under your account.</li>
              <li><strong>Lawful Use:</strong> You agree not to use the service for any unauthorized or illegal purposes, including attempting to bypass institutional restrictions or "gaming" the LMS system.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-red-600">4. No Affiliation</h2>
            <p>
              Ask Canvas 2.0 and TriFactor Scaling LLC are <strong>not affiliated with, endorsed by, or sponsored by Instructure, Inc. (Canvas) or Penn State University.</strong> We are an independent, third-party tool built to enhance the student experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Accuracy of Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>AI Limitations:</strong> You acknowledge that the AI (Cerebras/Llama) may occasionally "hallucinate" or provide inaccurate summaries of your data. Always verify critical information (like exam dates or final grades) directly within the official Canvas portal.</li>
              <li><strong>"As-Is" Basis:</strong> The service is provided "as-is" without warranties of any kind.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TriFactor Scaling LLC shall not be liable for any missed deadlines, incorrect grade interpretations, or data loss resulting from the use of this service. Use this tool strictly as a generic supplement, not a definitive source of truth.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Termination</h2>
            <p>
              We reserve the right to suspend or terminate access to the service for any user who violates these terms or attempts to compromise the security of our infrastructure.
            </p>
          </section>
        </div>

      </div>
    </div>
  )
}
