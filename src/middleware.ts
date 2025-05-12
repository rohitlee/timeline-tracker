
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const currentUserCookie = request.cookies.get('user');
  const { pathname } = request.nextUrl;

  // Allow access to login and register pages regardless of auth state
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  // If trying to access other pages and not authenticated, redirect to login
  if (!currentUserCookie) {
    if (pathname !== '/login') { // Avoid redirect loop if already on login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: pass redirect info
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // If authenticated and trying to access login/register, redirect to home
  if (currentUserCookie && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
      return NextResponse.redirect(new URL('/', request.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     * - assets (public assets folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};
