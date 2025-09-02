import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get resolution attachments for a request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;

    // For now, return empty array to avoid the Prisma connection error
    // This needs to be fixed when the attachments database is properly set up
    console.log(`Fetching resolution attachments for request ${requestId} - returning empty for now`);
    
    return NextResponse.json({ attachments: [] });

  } catch (error) {
    console.error('Error fetching resolution attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resolution attachments' },
      { status: 500 }
    );
  }
}
