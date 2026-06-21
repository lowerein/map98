import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "USER" | "ADMIN"
      status: "ACTIVE" | "INACTIVE" | "BANNED"
    } & DefaultSession["user"]
  }

  interface User {
    role?: "USER" | "ADMIN"
    status?: "ACTIVE" | "INACTIVE" | "BANNED"
  }
}
