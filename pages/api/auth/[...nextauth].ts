import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import {
  decodeIdTokenClaims,
  resolveActorIdentity,
  type AzureActorClaims,
} from "@/lib/auth/actor";

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
      // Default Azure AD profile() only maps email/name — fill email from UPN
      // when the tenant omits the optional email claim.
      profile(profile) {
        const claims = profile as AzureActorClaims & { sub?: string };
        const email =
          resolveActorIdentity(claims) ||
          (typeof profile.email === "string" ? profile.email : undefined);
        return {
          id: profile.sub,
          name: profile.name,
          email: email || null,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account, user }) {
      if (profile || account || user) {
        const fromProfile = resolveActorIdentity(
          profile as AzureActorClaims | undefined,
        );
        const fromIdToken = resolveActorIdentity(
          decodeIdTokenClaims(account?.id_token),
        );
        const fromUser =
          typeof user?.email === "string" ? user.email.trim() : "";
        const fromToken =
          typeof token.email === "string" ? token.email.trim() : "";

        const actorEmail =
          fromProfile || fromIdToken || fromUser || fromToken || "";

        if (actorEmail) {
          token.email = actorEmail;
        }

        if (profile) {
          const profileData = profile as AzureActorClaims & {
            roles?: string[];
            groups?: string[];
          };
          token.roles = profileData.roles || [];
          token.groups = profileData.groups || [];
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
