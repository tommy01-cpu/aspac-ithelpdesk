import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
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