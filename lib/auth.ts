import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { getUserPermissions } from "./permissions";
import { UserRole } from "@/types";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: credentials.email, isActive: true },
          include: { organization: true },
        });

        if (!user || !user.isActive) return null;
        if (!user.organization?.isActive) return null;

        const passwordOk = await bcrypt.compare(credentials.password, user.password);
        if (!passwordOk) return null;

        const extraPerms = JSON.parse(user.permissions || "[]") as string[];
        const permissions = getUserPermissions(user.role as UserRole, extraPerms);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          isSuperAdmin: user.role === "SUPERADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.isSuperAdmin = (user as any).isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
      }
      return session;
    },
  },
};
