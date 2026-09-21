'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [step, setStep] = useState<1 | 2>(1);
  const [pseudo, setPseudo] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/auth/login-dual');
    }
  }, [email, router]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (pseudo.length < 3 || pseudo.length > 50) {
      setError('Pseudo: 3-50 caractères');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (pin !== confirmPin) {
      setError('Les PIN ne correspondent pas');
      setLoading(false);
      return;
    }

    if (pin.length < 4 || pin.length > 6) {
      setError('PIN: 4-6 chiffres');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/setup-pseudo-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pseudo,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.erreur || 'Erreur lors de la création');
        setLoading(false);
        return;
      }

      setSuccess(true);
      localStorage.setItem('auth_token', data.token);
      document.cookie = `auth_token=${data.token}; path=/; secure; samesite=strict`;

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError('Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔗</div>
          <h1 className="text-3xl font-bold text-gray-800">Renforcer votre compte</h1>
          <p className="text-sm text-gray-600 mt-2">Ajoutez Pseudo+PIN</p>
        </div>

        <div className="flex gap-2 mb-8">
          <div className={`flex-1 h-2 rounded ${step >= 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div className={`flex-1 h-2 rounded ${step >= 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="text-5xl">✅</div>
            <h2 className="text-2xl font-bold text-green-600">Parfait!</h2>
            <p className="text-gray-700">
              Votre Pseudo+PIN <strong>{pseudo}</strong> est créé!
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>À la prochaine connexion:</strong>
              </p>
              <p className="text-xs text-gray-600">
                Utilisez <strong>Pseudo+PIN</strong> OU <strong>Email+Password</strong>
              </p>
            </div>
            <p className="text-xs text-gray-500">Redirection en cours...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Étape <strong>1/2</strong>: Choisir votre Pseudo
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pseudo (3-50 caractères)
                  </label>
                  <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="ex: rodor_gabon"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Caractères autorisés: lettres, chiffres, tirets bas
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    💡 <strong>Astuce:</strong> Utilisez quelque chose de mémorable
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                >
                  Continuer →
                </button>
              </form>
            ) : (
              <form onSubmit={handleStep2} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Étape <strong>2/2</strong>: Choisir votre PIN
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN (4-6 chiffres)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-center text-lg"
                    required
                    autoFocus
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-center text-lg"
                    required
                    inputMode="numeric"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-900">
                    ⚠️ <strong>Important:</strong> Gardez votre PIN secret!
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
                  >
                    ← Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
                  >
                    {loading ? 'Création...' : 'Créer PIN'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {!success && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:underline"
            >
              ⏭️ Passer cette étape
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
