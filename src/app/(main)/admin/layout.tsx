'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface JWTPayload {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        console.log('[ADMIN LAYOUT] Starting verification...');

        // ✅ Vérifier JWT - essayer localStorage d'abord
        let token = localStorage.getItem('auth_token');
        
        if (!token) {
          // Essayer cookies
          const cookies = document.cookie.split('; ');
          const authCookie = cookies.find(row => row.startsWith('auth_token='));
          if (authCookie) {
            token = authCookie.split('=')[1];
          }
        }

        console.log('[ADMIN LAYOUT] Token found:', !!token);

        if (!token) {
          console.warn('[ADMIN LAYOUT] No token found');
          setError('Non authentifié - veuillez vous connecter');
          setTimeout(() => router.push('/auth/login-dual'), 1500);
          return;
        }

        try {
          // ✅ Décoder JWT
          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Token format invalid');
          }

          // Padding fix for base64
          let payload = parts[1];
          payload += '='.repeat((4 - payload.length % 4) % 4);

          const decoded: JWTPayload = JSON.parse(
            Buffer.from(payload, 'base64').toString('utf-8')
          );

          console.log('[ADMIN LAYOUT] Decoded token:', { 
            role: decoded.role, 
            email: decoded.email,
            sub: decoded.sub 
          });

          // ✅ STRICT: Rôle MUST be admin
          if (decoded.role !== 'admin') {
            console.warn('[ADMIN LAYOUT] Not admin - role:', decoded.role);
            setError(`Accès refusé - Votre rôle: ${decoded.role}`);
            setTimeout(() => router.push('/'), 2500);
            return;
          }

          console.log('[ADMIN LAYOUT] ✅ Admin verified!');
          setVerified(true);

        } catch (decodeErr: any) {
          console.error('[ADMIN LAYOUT] JWT decode failed:', decodeErr.message);
          setError('Token invalide - veuillez vous reconnecter');
          localStorage.removeItem('auth_token');
          setTimeout(() => router.push('/auth/login-dual'), 1500);
        }

      } catch (err: any) {
        console.error('[ADMIN LAYOUT] Verification error:', err);
        setError('Erreur de vérification');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    // Délai court pour s'assurer que localStorage est ready
    const timer = setTimeout(verifyAdminAccess, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // ❌ Accès refusé
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès refusé</h1>
          <p className="text-gray-700 mb-2">{error}</p>
          <p className="text-xs text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  // ⏳ En cours de vérification
  if (!verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600 font-semibold">Vérification accès admin...</p>
          <p className="text-xs text-gray-500 mt-2">Merci de patienter</p>
        </div>
      </div>
    );
  }

  // ✅ Admin vérifié - afficher le contenu
  return <>{children}</>;
}
