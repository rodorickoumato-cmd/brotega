import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "yellow" | "red" | "gray" | "orange" | "outline";
  className?: string;
}

const variants = {
  green: "bg-[#FEF2F2] text-[#E63946]",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-600",
  gray: "bg-gray-100 text-gray-600",
  orange: "bg-orange-100 text-orange-600",
  outline: "border border-[#E63946] text-[#E63946] bg-transparent",
};

export function Badge({ children, variant = "green", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}
