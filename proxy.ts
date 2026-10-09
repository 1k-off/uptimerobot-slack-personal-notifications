import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    isAccessManagerFromClaims,
    isAdminFromClaims,
} from '@/lib/auth/access-manager';

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Static files from /public (logo, favicons, etc.) must bypass auth
    const isStaticAsset =
        /\.(?:png|jpe?g|gif|svg|webp|ico|txt|xml|json|woff2?|ttf|eot|map)$/i.test(
            pathname,
        );

    // Exclude specific paths from authentication
    if (
        isStaticAsset ||
        pathname.startsWith('/api/auth') || // NextAuth endpoints
        pathname.startsWith('/api/webhook') || // Webhook endpoint
        pathname.startsWith('/_next') || // Next.js static files
        pathname === '/favicon.ico' || // Favicon
        pathname === '/' // Allow access to the root path
    ) {
        return NextResponse.next();
    }

    // Get the session token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // If no token, redirect to the root page where the login button is
    if (!token) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    const claims = {
        email: token.email as string | undefined,
        roles: token.roles,
        groups: token.groups,
    };

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        if (!isAdminFromClaims(claims)) {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
    }

    if (
        pathname === '/access-management' ||
        pathname.startsWith('/access-management/')
    ) {
        if (!isAccessManagerFromClaims(claims)) {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
    }

    // If token exists, proceed
    return NextResponse.next();
}

export const config = {
    matcher: ['/:path*'],
};
