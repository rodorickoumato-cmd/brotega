import { getAppConfig } from "@/lib/config";

export default async function MaintenancePage() {
  const cfg = await getAppConfig();
  const message = (cfg as Record<string, unknown>).maintenance_message as string ?? "Le site est temporairement indisponible.";

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">🔧</div>
      <h1 className="text-2xl font-black text-gray-900 mb-3">Maintenance en cours</h1>
      <p className="text-gray-600 max-w-sm leading-relaxed">{message}</p>
      <p className="text-xs text-gray-400 mt-8">J'adore la Famille</p>
    </div>
  );
}
