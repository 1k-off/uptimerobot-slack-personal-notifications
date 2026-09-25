import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

type AzureProfile = {
  roles?: string[];
  groups?: string[];
  email?: string;
  preferred_username?: string;
  upn?: string;
};

function resolveActorEmail(profile: AzureProfile | undefined): string {
  return (
    profile?.email?.trim() ||
    profile?.upn?.trim() ||
    profile?.preferred_username?.trim() ||
    ""
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email offline_access",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const profileData = profile as AzureProfile;
        token.roles = profileData.roles || [];
        token.groups = profileData.groups || [];

        const actorEmail = resolveActorEmail(profileData);
        if (actorEmail) {
          token.email = actorEmail;
        }

        const adminEmails = process.env.ADMIN_EMAILS
          ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim())
          : [];
        token.isAdmin = adminEmails.includes(actorEmail);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as {
          id: string;
          email?: string | null;
          roles: string[];
          groups: string[];
          isAdmin: boolean;
        };
        user.id = token.sub!;
        user.roles = (token.roles as string[]) || [];
        user.groups = (token.groups as string[]) || [];
        if (typeof token.email === "string" && token.email) {
          user.email = token.email;
        }
        const adminGroups = process.env.ADMIN_GROUPS
          ? process.env.ADMIN_GROUPS.split(",").map((g) => g.trim())
          : [];
        const isAdminFromToken = Boolean(token.isAdmin);
        const isAdminFromGroups =
          token.groups &&
          Array.isArray(token.groups) &&
          token.groups.some((group) =>
            adminGroups.includes(group as string),
          );
        const isAdminFromRoles =
          token.roles &&
          Array.isArray(token.roles) &&
          token.roles.includes("Admin");
        user.isAdmin =
          isAdminFromToken ||
          Boolean(isAdminFromGroups) ||
          Boolean(isAdminFromRoles);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

export default NextAuth(authOptions);
