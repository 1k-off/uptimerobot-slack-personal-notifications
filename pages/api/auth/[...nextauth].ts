import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
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
                const profileData = profile as { roles?: string[]; groups?: string[]; email?: string };
                token.roles = profileData.roles || [];
                token.groups = profileData.groups || [];

                const adminEmails = process.env.ADMIN_EMAILS ?
                    process.env.ADMIN_EMAILS.split(',') : [];
                token.isAdmin = adminEmails.includes(profileData.email || '');
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const user = session.user as { id: string; roles: string[]; groups: string[]; isAdmin: boolean };
                user.id = token.sub!;
                user.roles = (token.roles as string[]) || [];
                user.groups = (token.groups as string[]) || [];
                const adminGroups = process.env.ADMIN_GROUPS ?
                    process.env.ADMIN_GROUPS.split(',') : [];
                const isAdminFromToken = Boolean(token.isAdmin);
                const isAdminFromGroups = token.groups && Array.isArray(token.groups) && 
                    token.groups.some(group => adminGroups.includes(group as string));
                const isAdminFromRoles = token.roles && Array.isArray(token.roles) && 
                    token.roles.includes('Admin');
                user.isAdmin = isAdminFromToken || Boolean(isAdminFromGroups) || Boolean(isAdminFromRoles);
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
