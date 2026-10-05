"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Scan {
  id: string;
  code: string;
  campagne: string;
  nom: string | null;
  nom_saisi_at: string | null;
  created_at: string;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function QrScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [campagnes, setCampagnes] = useState<string[]>([]);
  const [campagne, setCampagne] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const charger = useCallback(async (filtre: string) => {
    setLoading(true);
    setError("");
    try {
      const url = filtre ? `/api/admin/qr-scans?campagne=${encodeURIComponent(filtre)}` : "/api/admin/qr-scans";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.erreur || "Erreur de chargement");
        return;
      }
      setScans(data.scans);
      setTotal(data.total);
      setCampagnes(data.campagnes);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => charger(campagne), 0);
    return () => clearTimeout(t);
  }, [campagne, charger]);

  const avecNom = scans.filter((s) => s.nom).length;

  const exporterCSV = () => {
    const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lignes = [
      ["code", "campagne", "nom", "date_scan"].join(";"),
      ...scans.map((s) =>
        [s.code, s.campagne, s.nom || "", s.created_at].map(echapper).join(";")
      ),
    ];
    const blob = new Blob(["﻿" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-scans${campagne ? `-${campagne}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800 mb-1">📱 Scans QR</h1>
            <p className="text-gray-600 text-sm">
              {total} code{total > 1 ? "s" : ""} généré{total > 1 ? "s" : ""} · {avecNom} avec nom
              {total > scans.length && ` (500 plus récents affichés)`}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={campagne}
              onChange={(e) => setCampagne(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Toutes les campagnes</option>
              {campagnes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={exporterCSV}
              disabled={scans.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg px-4 py-2"
            >
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : scans.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">Aucun scan pour l&apos;instant</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-bold">Code</th>
                  <th className="px-4 py-3 font-bold">Campagne</th>
                  <th className="px-4 py-3 font-bold">Nom</th>
                  <th className="px-4 py-3 font-bold">Date du scan</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">{s.code}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 rounded px-2 py-0.5 text-xs">{s.campagne}</span>
                    </td>
                    <td className="px-4 py-3">{s.nom || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
