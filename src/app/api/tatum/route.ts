// API Route: Check wallet activity via Tatum
import { NextRequest, NextResponse } from 'next/server';
import { getTatumClient } from '@/lib/tatum';

export async function POST(request: NextRequest) {
  try {
    const { address, daysThreshold = 30 } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const tatum = getTatumClient();
    const activity = await tatum.checkWalletActivity(address, daysThreshold);

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Tatum check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check wallet activity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const tatum = getTatumClient();
    const [activity, balance] = await Promise.all([
      tatum.checkWalletActivity(address),
      tatum.getBalance(address),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...activity,
        balance,
      },
    });
  } catch (error) {
    console.error('Tatum query failed:', error);
    return NextResponse.json(
      { error: 'Failed to query wallet data' },
      { status: 500 }
    );
  }
}
