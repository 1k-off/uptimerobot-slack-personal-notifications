import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Exclude specific paths from authentication
  if (
    pathname.startsWith('/api/auth') || // NextAuth endpoints
    pathname.startsWith('/api/webhook') || // Webhook endpoint
    pathname.startsWith('/_next') || // Next.js static files
    pathname === '/favicon.ico' || // Favicon
    pathname === '/public' || // Public folder
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

  // If token exists, proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
