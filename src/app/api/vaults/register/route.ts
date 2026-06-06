import { NextResponse } from 'next/server';
import { saveVault } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming vault registration:', body);
    const { vaultId, emails } = body;

    if (!vaultId || !Array.isArray(emails)) {
      console.error('Registration failed: Missing vaultId or emails array');
      return NextResponse.json(
        { success: false, error: 'Missing vaultId or emails array' },
        { status: 400 }
      );
      }

    const filteredEmails = emails.filter(Boolean).map((e: string) => e.toLowerCase());
    if (filteredEmails.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No emails to register' }
      );
    }

    const saved = saveVault(vaultId, filteredEmails);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to write to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
