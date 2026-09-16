'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginDualPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'email' | 'pseudo'>('pseudo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ NEW METHOD: Pseudo + PIN
  const [pseudo, setPseudo] = useState('');
  const [pin, setPin] = useState('');

  // ✅ OLD METHOD: Email ONLY
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;

      if (method === 'pseudo') {
        res = await fetch('/api/auth/login-dual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authMethod: 'pseudo', pseudo, pin }),
        });
      } else {
        // ✅ NEW: Use instant login endpoint
        res = await fetch('/api/auth/login-email-instant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.erreur || 'Erreur de connexion');
        setLoading(false);
        return;
      }

      localStorage.setItem('auth_token', data.token);
      document.cookie = `auth_token=${data.token}; path=/; secure; samesite=strict`;

      if (data.message?.includes('migration') || data.user?.migration_required) {
        setTimeout(() => router.push('/auth/migrate-now'), 2000);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Brotega</h1>
        <p className="text-center text-gray-600 mb-6">Choisissez votre méthode</p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setMethod('pseudo'); setError(''); }}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              method === 'pseudo'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🆕 Pseudo+PIN
          </button>
          <button
            onClick={() => { setMethod('email'); setError(''); }}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              method === 'email'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📧 Email
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {method === 'pseudo' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pseudo</label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="votre_pseudo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4-6 chiffres)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
              <p className="text-xs text-gray-600">✅ Nouveau système sécurisé</p>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <p className="text-xs text-blue-600">ℹ️ Entrez email - connexion instant!</p>
              <p className="text-xs text-orange-600">⚠️ Ancien système</p>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition ${
              method === 'pseudo'
                ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400'
                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400'
            }`}
          >
            {loading ? 'Connexion...' : 'Connexion'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          <a href="/auth/register" className="block text-center text-sm text-blue-600 hover:underline">
            Pas de compte? S'inscrire
          </a>
          <a href="/auth/recover" className="block text-center text-sm text-gray-600 hover:underline">
            Mot de passe oublié?
          </a>
          <a href="/auth/migrate-now" className="block text-center text-sm text-orange-600 hover:underline font-semibold">
            🔄 Migrer vers Pseudo+PIN
          </a>
        </div>
      </div>
    </div>
  );
}
