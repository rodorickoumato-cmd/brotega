'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        // ✅ Vérifier JWT dans localStorage ET cookies
        const token = localStorage.getItem('auth_token') || 
                     document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];

        if (!token) {
          setError('Non authentifié');
          setTimeout(() => router.push('/auth/login-dual'), 1500);
          return;
        }

        try {
          // ✅ Décoder JWT
          const parts = token.split('.');
          if (parts.length !== 3) throw new Error('Token invalide');

          const decoded = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf-8')
          );

          console.log('[ADMIN LAYOUT] User:', decoded);

          // ✅ STRICT: Vérifier rôle = admin
          if (decoded.role !== 'admin') {
            console.warn('[ADMIN LAYOUT] Access denied:', decoded.role);
            setError(`Accès refusé. Vous êtes: ${decoded.role}`);
            setTimeout(() => router.push('/'), 2000);
            return;
          }

          // ✅ Admin vérifié!
          setVerified(true);
        } catch (err: any) {
          console.error('[ADMIN LAYOUT] JWT decode error:', err);
          setError('Token invalide');
          localStorage.removeItem('auth_token');
          setTimeout(() => router.push('/auth/login-dual'), 1500);
        }
      } catch (err) {
        console.error('[ADMIN LAYOUT] Verification error:', err);
        setError('Erreur de vérification');
      }
    };

    verifyAdminAccess();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès refusé</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <p className="text-xs text-gray-500">Redirection...</p>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Vérification droits admin...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
