import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ApiHandler = (request: Request, context?: any) => Promise<Response | NextResponse>;

/**
 * Wrapper for API route handlers that provides error handling.
 * Note: Connection management is now handled by the singleton Prisma client pattern.
 * No manual disconnect needed as the singleton client persists across requests.
 */
export function withDatabaseConnectionManagement(handler: ApiHandler): ApiHandler {
  return async function wrappedHandler(request: Request, context?: any): Promise<Response | NextResponse> {
    try {
      // Call the original handler
      const response = await handler(request, context);
      return response;
    } catch (error) {
      // Re-throw the error to maintain original behavior
      throw error;
    }
    // No finally block needed - singleton client handles connection lifecycle
  };
}

/**
 * Legacy helper - no longer performs disconnection due to singleton pattern.
 * Kept for backward compatibility but effectively a no-op.
 */
export async function disconnectInDevelopment() {
  // No operation - singleton client pattern handles connection management
  // Disconnecting would interfere with other concurrent requests
}

export default withDatabaseConnectionManagement;
