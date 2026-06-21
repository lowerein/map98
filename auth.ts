import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // Block banned users from establishing a session at sign-in time.
    async signIn({ user }) {
      if (!user?.email) return true
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { status: true },
      })
      if (existing?.status === "BANNED") return false
      return true
    },
    // Surface the DB user id / role / status onto the client-readable session.
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // `user` is the full Prisma row when using the database session strategy.
        session.user.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER"
        session.user.status =
          (user as { status?: "ACTIVE" | "INACTIVE" | "BANNED" }).status ?? "ACTIVE"
      }
      return session
    },
  },
})
