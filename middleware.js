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

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Admin page - check for admin privileges
    const adminEmails = process.env.ADMIN_EMAILS ?
        process.env.ADMIN_EMAILS.split(',') : [];
    const adminGroups = process.env.ADMIN_GROUPS ?
        process.env.ADMIN_GROUPS.split(',') : [];

    const isAdmin =
        adminEmails.includes(token.email) ||
        (token.groups && token.groups.some(group => adminGroups.includes(group))) ||
        (token.roles && token.roles.includes('Admin'));

    if (!isAdmin) {
      // User is not an admin, redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }



  // If token exists, proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
