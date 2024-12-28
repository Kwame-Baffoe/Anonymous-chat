import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified middleware that doesn't use crypto module
export function middleware(request: NextRequest) {
  // Add any non-crypto middleware logic here if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/messages/:path*',
    '/api/rooms/:path*',
    '/api/users/:path*',
    '/dashboard',
    '/rooms/:path*'
  ],
};
