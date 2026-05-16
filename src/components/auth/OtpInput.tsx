"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  longueur?: number;
  valeur: string;
  onChange: (code: string) => void;
  onComplet?: (code: string) => void;
};

// 6 cases visuelles — auto-focus, paste, navigation flèches
export function OtpInput({ longueur = 6, valeur, onChange, onComplet }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [chars, setChars] = useState<string[]>(() =>
    Array.from({ length: longueur }, (_, i) => valeur[i] ?? "")
  );

  useEffect(() => {
    const arr = Array.from({ length: longueur }, (_, i) => valeur[i] ?? "");
    setChars(arr);
  }, [valeur, longueur]);

  const propager = (next: string[]) => {
    const code = next.join("");
    onChange(code);
    if (code.length === longueur && next.every((c) => c !== "")) onComplet?.(code);
  };

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[i] = ch;
    setChars(next);
    propager(next);
    if (ch && i < longueur - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < longueur - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const colle = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, longueur);
    if (!colle) return;
    e.preventDefault();
    const next = Array.from({ length: longueur }, (_, i) => colle[i] ?? "");
    setChars(next);
    propager(next);
    refs.current[Math.min(colle.length, longueur - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length: longueur }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={chars[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-black border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all"
        />
      ))}
    </div>
  );
}
