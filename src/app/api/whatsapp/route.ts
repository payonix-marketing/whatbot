import { NextRequest, NextResponse } from 'next/server';

/**
 * --- WEBHOOK VERIFICATION ---
 * This is the endpoint Meta will call to verify your webhook.
 * It expects a 200 OK response with the challenge token.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if a token and mode is in the query string of the request
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // Responds with the challenge token from the request
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    // Responds with '403 Forbidden' if verify tokens do not match
    return new NextResponse('Forbidden', { status: 403 });
  }
}

/**
 * --- RECEIVE MESSAGES ---
 * This is the endpoint Meta will call when a new message is sent to your number.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log(JSON.stringify(body, null, 2));

  // TODO: Process the message payload
  // - Check if it's a valid WhatsApp message
  // - Find the customer by phone number
  // - Create a new conversation or add to an existing one
  // - Save the message to your database
  // - Push a real-time update to the frontend

  return new NextResponse('OK', { status: 200 });
}