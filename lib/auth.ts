// Auth.js (NextAuth) setup: email + password login, with the user's role
// stored in the session so every page and API route can check it.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  // Sessions are stored in a signed, encrypted cookie (JWT) — no session table needed.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, role } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        // Same vague error for "no such user" and "wrong password",
        // so nobody can use the login form to find out who has an account.
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          throw new Error("Wrong email or password.");
        }
        // Customers and owners use separate login pages.
        if (user.role !== role) {
          throw new Error(
            user.role === "OWNER"
              ? "This is a restaurant owner account. Please use the owner login."
              : "This is a customer account. Please use the customer login.",
          );
        }
        // Only these fields go into the session. Never the password hash.
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    // Runs when the session cookie is created/refreshed: copy id + role into it.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Shapes what `getServerSession()` / `useSession()` return.
    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name ?? "",
        email: token.email ?? "",
        role: token.role,
      };
      return session;
    },
  },
};
