'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MigrateNowPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'setup' | 'success'>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [daysLeft, setDaysLeft] = useState(0);

  // Form state
  const [pseudo, setPseudo] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phrase' | 'code'>(
    'email'
  );
  const [recoveryData, setRecoveryData] = useState('');

  // Calculate days left until deadline
  useEffect(() => {
    const deadline = new Date('2026-10-14');
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    setDaysLeft(Math.max(0, days));
  }, []);

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate
    if (pin !== pinConfirm) {
      setError('Les PINs ne correspondent pas');
      setLoading(false);
      return;
    }

    if (recoveryMethod !== 'code' && !recoveryData) {
      setError('Veuillez remplir la méthode de récupération');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/migrate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pseudo,
          pin,
          recoveryMethod,
          recoveryData:
            recoveryMethod === 'email'
              ? localStorage.getItem('user_email')
              : recoveryData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.erreur || 'Erreur migration');
        setLoading(false);
        return;
      }

      // ✅ Save new JWT
      localStorage.setItem('auth_token', data.token);
      document.cookie = `auth_token=${data.token}; path=/; secure; samesite=strict`;

      setStep('success');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError('Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* ========== INTRO STEP ========== */}
        {step === 'intro' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔄</div>
              <h1 className="text-2xl font-bold text-gray-800">
                Migration Obligatoire
              </h1>
              <p className="text-gray-600 mt-2">
                Pseudo + PIN pour plus de sécurité
              </p>
            </div>

            <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-6">
              <p className="text-sm text-orange-800 font-semibold">
                ⏰ {daysLeft > 0 ? `${daysLeft} jours` : 'Migration urgente'}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Deadline: 14 Octobre 2026
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                ✅ Avantages du nouveau système:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>🔒 Plus sécurisé (bcrypt hashing)</li>
                <li>⚡ Plus rapide (pas d'email OTP)</li>
                <li>💾 Fonctionne hors ligne</li>
                <li>🛡️ Protégé contre les attaques brute-force</li>
              </ul>
            </div>

            <button
              onClick={() => setStep('setup')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition"
            >
              Commencer la migration
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Vous ne pouvez plus vous connecter avec l'ancien système après le
              14 octobre.
            </p>
          </>
        )}

        {/* ========== SETUP STEP ========== */}
        {step === 'setup' && (
          <>
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              Créer votre Pseudo+PIN
            </h2>

            <form onSubmit={handleMigrate} className="space-y-4">
              {/* Pseudo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau Pseudo (3-50 caractères)
                </label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="votre_pseudo_unik"
                  minLength={3}
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              {/* PIN */}
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

              {/* PIN Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              {/* Recovery Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Méthode de récupération
                </label>
                <select
                  value={recoveryMethod}
                  onChange={(e) =>
                    setRecoveryMethod(
                      e.target.value as 'email' | 'phrase' | 'code'
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="email">📧 Email</option>
                  <option value="phrase">📝 Phrase secrète</option>
                  <option value="code">🔑 Code unique</option>
                </select>
              </div>

              {/* Recovery Data */}
              {recoveryMethod === 'phrase' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phrase secrète
                  </label>
                  <input
                    type="text"
                    value={recoveryData}
                    onChange={(e) => setRecoveryData(e.target.value)}
                    placeholder="Ex: Mon chat préféré s'appelle Tigrou"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg transition"
              >
                {loading ? 'Migration en cours...' : 'Valider la migration'}
              </button>
            </form>
          </>
        )}

        {/* ========== SUCCESS STEP ========== */}
        {step === 'success' && (
          <>
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Migration réussie!
              </h2>
              <p className="text-gray-600 mb-6">
                Votre compte a été migré avec succès.
              </p>

              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-green-800">
                  <strong>Votre nouveau pseudo:</strong> {pseudo}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Redirection en cours... Ou{' '}
                <button
                  onClick={() => router.push('/')}
                  className="text-blue-600 hover:underline"
                >
                  cliquez ici
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
