// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate: only ADMINs may see anything under /admin.
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.role !== "ADMIN") redirect("/planner");

  return <AdminShell>{children}</AdminShell>;
}
