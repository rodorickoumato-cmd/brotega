'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginDualPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'email' | 'pseudo'>('pseudo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const [pseudo, setPseudo] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowPasswordReset(false);

    try {
      let res;

      if (method === 'pseudo') {
        res = await fetch('/api/auth/login-dual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authMethod: 'pseudo', pseudo, pin }),
        });
      } else {
        res = await fetch('/api/auth/login-email-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        // ✅ Si password_reset_available, afficher lien de récupération
        if (data.password_reset_available && method === 'email') {
          setShowPasswordReset(true);
        }
        setError(data.erreur || 'Erreur de connexion');
        setLoading(false);
        return;
      }

      // ✅ Si setup_pseudo_pin_required, rediriger vers setup
      if (data.setup_pseudo_pin_required) {
        localStorage.setItem('auth_token', data.token);
        router.push(`/auth/setup-pseudo-pin?email=${encodeURIComponent(email)}`);
        return;
      }

      // ✅ Connexion normale
      localStorage.setItem('auth_token', data.token);
      document.cookie = `auth_token=${data.token}; path=/; secure; samesite=strict`;

      router.push('/');
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
        <p className="text-center text-gray-600 mb-6">Connexion</p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setMethod('pseudo'); setError(''); setShowPasswordReset(false); }}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              method === 'pseudo'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🆕 Pseudo+PIN
          </button>
          <button
            onClick={() => { setMethod('email'); setError(''); setShowPasswordReset(false); }}
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
          <div className={`${showPasswordReset ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-red-100 border-red-400 text-red-700'} border px-4 py-3 rounded mb-4`}>
            {error}
          </div>
        )}

        {showPasswordReset && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 mb-3">
              Vous avez oublié votre mot de passe?
            </p>
            <Link
              href="/auth/reset-password-email"
              className="block w-full text-center p-3 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold transition"
            >
              📧 Récupérer mon compte
            </Link>
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
              <p className="text-xs text-gray-600">✅ Nouveau système</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
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

        {!showPasswordReset && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
            <a href="/auth/register" className="block text-center text-sm text-blue-600 hover:underline">
              Pas de compte? S'inscrire
            </a>
            
            {method === 'pseudo' && (
              <Link href="/auth/recover" className="block text-center text-sm text-gray-600 hover:underline">
                Accès perdu? Récupération
              </Link>
            )}
            
            <a href="/auth/migrate-now" className="block text-center text-sm text-orange-600 hover:underline font-semibold">
              🔄 Migrer vers Pseudo+PIN
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
