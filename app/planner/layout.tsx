// app/planner/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";

export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard — no client flash, and protects the route at the edge.
  const session = await auth();
  if (!session?.user) redirect("/");

  if (session.user.status === "INACTIVE") {
    redirect("/pending");
  }

  if (session.user.status === "BANNED") {
    return (
      <div className="p-12 text-center text-red-500 font-black">
        你的帳號已被系統封鎖。
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}
