const TYPE_STYLE: Record<string, string> = {
  info:    "bg-blue-600 text-white",
  succes:  "bg-green-600 text-white",
  alerte:  "bg-[#E63946] text-white",
};

export function BanniereSysteme({
  texte,
  type = "info",
}: {
  texte: string;
  type?: string;
}) {
  if (!texte) return null;
  const style = TYPE_STYLE[type] ?? TYPE_STYLE.info;
  return (
    <div className={`w-full px-4 py-2.5 text-center text-sm font-semibold ${style}`}>
      {texte}
    </div>
  );
}
