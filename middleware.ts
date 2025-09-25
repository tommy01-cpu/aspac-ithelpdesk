import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Redirect localhost:3000 to production URL
    // const host = req.headers.get('host');
    // if (host === 'localhost:3000' || host === '127.0.0.1:3000') {
    //   const productionUrl = 'https://ithelpdesk-369463028575.asia-southeast1.run.app';
    //   const redirectUrl = `${productionUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;
      
    //   console.log(`🔄 Redirecting from ${host}${req.nextUrl.pathname} to ${redirectUrl}`);
    //   return NextResponse.redirect(redirectUrl);
    // }

    // Add any additional middleware logic here if needed
    if (process.env.NODE_ENV !== 'production') {
      console.log("Middleware running for:", req.nextUrl.pathname);
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow access to public routes
        const publicPaths = ['/login', '/signup', '/forgot-password', '/api/auth'];
        const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
        
        if (isPublicPath) {
          return true;
        }
        
        // For protected routes, require authentication
        return !!token;
      }
    },
    pages: {
      signIn: '/login', // Ensure NextAuth uses the correct login page
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes are excluded to avoid middleware on data fetches)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Image files (png, jpg, etc.)
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)",
  ]
}