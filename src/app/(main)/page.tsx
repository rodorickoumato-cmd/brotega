/**
 * DELETE THIS FILE — it conflicts with app/page.tsx (both resolve to "/").
 * Run fix-routing.bat or: del "src\app\(main)\page.tsx"
 */
import { redirect } from "next/navigation";
export default function ConflictGuard() {
  redirect("/");
}
