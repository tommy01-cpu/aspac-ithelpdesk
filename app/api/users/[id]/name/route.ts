import { NextRequest, NextResponse } from 'next/server';
import { getAssignedTechnicianName } from '@/lib/technician-lookup';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const technicianId = params.id;
    
    if (!technicianId) {
      return NextResponse.json({ error: 'Invalid technician ID' }, { status: 400 });
    }

    // Use the existing technician-lookup utility
    const name = await getAssignedTechnicianName(technicianId);

    return NextResponse.json({ 
      name: name || 'Unknown'
    });
  } catch (error) {
    console.error('Error fetching technician name:', error);
    return NextResponse.json({ error: 'Failed to fetch technician name' }, { status: 500 });
  }
}