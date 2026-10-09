import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import {
  decodeIdTokenClaims,
  resolveActorIdentity,
  type AzureActorClaims,
} from "@/lib/auth/actor";
import {
  isAccessManagerFromClaims,
  isAdminFromClaims,
} from "@/lib/auth/access-manager";

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

        token.isAdmin = isAdminFromClaims({
          email: actorEmail,
          roles: token.roles,
          groups: token.groups,
        });
        token.isAccessManager = isAccessManagerFromClaims({
          email: actorEmail,
          roles: token.roles,
          groups: token.groups,
        });
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
          isAccessManager: boolean;
        };
        user.id = token.sub!;
        user.roles = (token.roles as string[]) || [];
        user.groups = (token.groups as string[]) || [];
        if (typeof token.email === "string" && token.email) {
          user.email = token.email;
        }
        const claims = {
          email: user.email,
          roles: token.roles,
          groups: token.groups,
        };
        user.isAdmin =
          Boolean(token.isAdmin) || isAdminFromClaims(claims);
        user.isAccessManager =
          Boolean(token.isAccessManager) ||
          user.isAdmin ||
          isAccessManagerFromClaims(claims);
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
