import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { to, text, attachmentUrl, mimeType, fileName } = await req.json();

    if (!to || (!text && !attachmentUrl)) {
      return NextResponse.json({ error: 'Request must include "to" and either "text" or "attachmentUrl"' }, { status: 400 });
    }

    const result = await sendMessage(to, { text, attachmentUrl, mimeType, fileName });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}