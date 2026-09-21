'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.erreur || 'Erreur lors de la réinitialisation');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setEmail('');
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
        <p className="text-center text-gray-600 mb-6">Récupération de compte</p>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-lg text-center">
              ✅ Email envoyé!
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700">
                <strong>Vérifiez votre boîte mail</strong> (et courrier indésirable)
              </p>
              <p className="text-xs text-gray-600">
                Cliquez le lien dans l'email pour réinitialiser votre mot de passe.
              </p>
            </div>
            <Link
              href="/auth/login-dual"
              className="block text-center text-blue-600 hover:underline font-semibold"
            >
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de votre compte
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            >
              {loading ? 'Envoi...' : 'Envoyer email de réinitialisation'}
            </button>

            <div className="text-center space-y-2 pt-4 border-t border-gray-200">
              <Link
                href="/auth/login-dual"
                className="block text-sm text-blue-600 hover:underline"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
