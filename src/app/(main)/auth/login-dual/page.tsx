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

  // ✅ OLD METHOD: Email + Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload =
        method === 'pseudo'
          ? { authMethod: 'pseudo', pseudo, pin }
          : { authMethod: 'email', email, password };

      const res = await fetch('/api/auth/login-dual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.erreur || 'Erreur de connexion');
        setLoading(false);
        return;
      }

      // ✅ Save JWT and redirect
      localStorage.setItem('auth_token', data.token);
      document.cookie = `auth_token=${data.token}; path=/; secure; samesite=strict`;

      // ⚠️ Show migration warning if needed
      if (data.migration_required) {
        localStorage.setItem('migration_deadline', data.migration_deadline);
        setTimeout(() => {
          router.push('/auth/migrate-now');
        }, 2000);
      } else {
        // Redirect based on role (would need to decode JWT)
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
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Brotega
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Choisissez votre méthode de connexion
        </p>

        {/* ========== TABS ========== */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setMethod('pseudo');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              method === 'pseudo'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🆕 Pseudo+PIN
          </button>
          <button
            onClick={() => {
              setMethod('email');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              method === 'email'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📧 Email (Ancien)
          </button>
        </div>

        {/* ========== ERROR ========== */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* ========== FORM ========== */}
        <form onSubmit={handleLogin} className="space-y-4">
          {method === 'pseudo' ? (
            <>
              {/* ✅ NEW: Pseudo + PIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pseudo
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (4-6 chiffres)
                </label>
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
              <p className="text-xs text-gray-600 mt-2">
                ✅ Nouveau système sécurisé
              </p>
            </>
          ) : (
            <>
              {/* ❌ OLD: Email + Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Ancien système - Migration recommandée avant 14/10/2026
              </p>
            </>
          )}

          {/* ========== SUBMIT ========== */}
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

        {/* ========== LINKS ========== */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          <a
            href="/auth/register"
            className="block text-center text-sm text-blue-600 hover:underline"
          >
            Pas de compte? S'inscrire
          </a>
          <a
            href="/auth/recover"
            className="block text-center text-sm text-gray-600 hover:underline"
          >
            Mot de passe oublié?
          </a>
          <a
            href="/auth/migrate-now"
            className="block text-center text-sm text-orange-600 hover:underline font-semibold"
          >
            🔄 Migrer vers Pseudo+PIN
          </a>
        </div>
      </div>
    </div>
  );
}
