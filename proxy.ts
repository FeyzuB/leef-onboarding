import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

// Cheap first gate: no session cookie → login page. The real check (signature, user, role)
// happens server-side in requireUser() on every page and action.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api/health|_next/static|_next/image|favicon.ico).*)'],
};
