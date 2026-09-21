'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserInfo {
  id: string;
  email: string;
  role: string;
  pseudo?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          setError('Non authentifié');
          setTimeout(() => router.push('/auth/login-dual'), 1500);
          return;
        }

        // ✅ Décoder JWT pour obtenir user info
        try {
          const parts = token.split('.');
          if (parts.length !== 3) throw new Error('Token invalide');

          const decoded = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf-8')
          );

          // ✅ Vérifier rôle admin
          if (decoded.role !== 'admin') {
            setError(`Accès refusé. Rôle: ${decoded.role}`);
            setTimeout(() => router.push('/'), 2000);
            return;
          }

          setUser(decoded);
        } catch (err) {
          setError('Token invalide');
          localStorage.removeItem('auth_token');
          setTimeout(() => router.push('/auth/login-dual'), 1500);
        }
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès refusé</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                👨‍💼 Dashboard Administrateur
              </h1>
              <p className="text-gray-600">Bienvenue {user.pseudo || user.email}</p>
            </div>
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Statut</p>
              <p className="text-xl font-bold text-green-600">✅ ADMIN</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-2">👥 Utilisateurs</p>
            <p className="text-3xl font-bold text-blue-600">---</p>
            <p className="text-xs text-gray-500 mt-2">À développer</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-2">🛍️ Commandes</p>
            <p className="text-3xl font-bold text-green-600">---</p>
            <p className="text-xs text-gray-500 mt-2">À développer</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-2">💰 Revenus</p>
            <p className="text-3xl font-bold text-purple-600">---</p>
            <p className="text-xs text-gray-500 mt-2">À développer</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-2">📊 Vendeurs</p>
            <p className="text-3xl font-bold text-orange-600">---</p>
            <p className="text-xs text-gray-500 mt-2">À développer</p>
          </div>
        </div>

        {/* Menu Admin */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <p className="text-3xl mb-2">👥</p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Utilisateurs</h3>
            <p className="text-sm text-gray-600">Gérer les utilisateurs</p>
          </Link>

          <Link
            href="/admin/orders"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <p className="text-3xl mb-2">📦</p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Commandes</h3>
            <p className="text-sm text-gray-600">Voir toutes les commandes</p>
          </Link>

          <Link
            href="/admin/vendors"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <p className="text-3xl mb-2">🏪</p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Vendeurs</h3>
            <p className="text-sm text-gray-600">Approuver/gérer vendeurs</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <p className="text-3xl mb-2">⚙️</p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Configuration</h3>
            <p className="text-sm text-gray-600">Paramètres système</p>
          </Link>

          <Link
            href="/admin/logs"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <p className="text-3xl mb-2">📋</p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Logs</h3>
            <p className="text-sm text-gray-600">Historique d'audit</p>
          </Link>

          <Link
            href="/admin/migration-stats"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <p className="text-3xl mb-2">📊</p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Migration</h3>
            <p className="text-sm text-gray-600">Stats de migration</p>
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ Information</h3>
          <p className="text-sm text-blue-800">
            Vous êtes connecté en tant qu'administrateur. Tous les accès admin vous sont disponibles.
            À la prochaine connexion, vous pourrez utiliser Pseudo+PIN OU Email+Password.
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">ID Utilisateur</p>
          <p className="font-mono text-xs text-gray-500 break-all">{user.id}</p>
          <p className="text-sm text-gray-600 mt-4 mb-2">Email</p>
          <p className="text-sm text-gray-800">{user.email}</p>
          <button
            onClick={() => {
              localStorage.removeItem('auth_token');
              document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
              router.push('/auth/login-dual');
            }}
            className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
