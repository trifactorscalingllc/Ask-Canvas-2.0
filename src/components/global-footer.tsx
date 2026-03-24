'use client';

import { usePathname } from 'next/navigation';

export function GlobalFooter() {
  const pathname = usePathname();

  if (pathname === '/chat') return null;

  return (
    <footer className="mt-auto py-8 text-center text-sm text-gray-500 border-t border-gray-100 bg-white shadow-inner flex-shrink-0">
      <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 px-4 font-medium">
        <a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
        <a href="/security" className="hover:text-blue-600 transition-colors">Security</a>
        <a href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</a>
        <a href="mailto:support@askcanvas.com" className="hover:text-blue-600 transition-colors">Contact Support</a>
      </div>
      <p className="mt-4 text-xs text-gray-400 tracking-wide">&copy; {new Date().getFullYear()} Ask Canvas 2.0. All rights reserved.</p>
    </footer>
  );
}
