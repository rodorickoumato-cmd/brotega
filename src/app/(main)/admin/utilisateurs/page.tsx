"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface User {
  id: string;
  pseudo: string;
  email?: string;
  role: string;
  recovery_method: string;
  actif: boolean;
  created_at?: string;
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        // Récupérer tous les utilisateurs enregistrés avec pseudo
        const { data, error, count } = await (supabase
          .from("utilisateurs_auth_v2" as any)
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(100)) as any;

        if (error) {
          console.error("Error loading users:", error);
          return;
        }

        setUsers(data || []);
        setTotal(count || 0);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ROLE_COLORS: Record<string, string> = {
    customer: "bg-blue-100 text-blue-700",
    vendor: "bg-yellow-100 text-yellow-700",
    livreur: "bg-orange-100 text-orange-700",
    admin: "bg-green-100 text-green-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-800 mb-2">
            👥 Utilisateurs Enregistrés
          </h1>
          <p className="text-gray-600">
            {total} utilisateurs avec Pseudo+PIN
          </p>
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">
            Aucun utilisateur enregistré
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">
                    Pseudo
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">
                    Récupération
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">
                    Actif
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {user.pseudo}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.email || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          ROLE_COLORS[user.role] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.recovery_method}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.actif
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.actif ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/admin"
            className="text-green-600 hover:text-green-700 font-bold"
          >
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
