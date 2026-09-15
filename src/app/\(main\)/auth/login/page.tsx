'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Old login page - REDIRECTS to new dual authentication
 * This ensures all users see the new Pseudo+PIN and Email (Legacy) tabs
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new dual login interface
    router.replace('/auth/login-dual');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-600">Redirection vers la nouvelle interface...</p>
      </div>
    </div>
  );
}
