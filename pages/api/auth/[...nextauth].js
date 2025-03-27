import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email offline_access"
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.roles = profile.roles || [];
        token.groups = profile.groups || [];

        const adminEmails = process.env.ADMIN_EMAILS ?
            process.env.ADMIN_EMAILS.split(',') : [];
        token.isAdmin = adminEmails.includes(profile.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.roles = token.roles || [];
        session.user.groups = token.groups || [];
        const adminGroups = process.env.ADMIN_GROUPS ?
            process.env.ADMIN_GROUPS.split(',') : [];
        session.user.isAdmin = token.isAdmin ||
            (token.groups && token.groups.some(group => adminGroups.includes(group))) ||
            (token.roles && token.roles.includes('Admin'));
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  }
};

export default NextAuth(authOptions);