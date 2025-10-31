import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/lib/types';

/**
 * --- WEBHOOK VERIFICATION ---
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

/**
 * --- RECEIVE MESSAGES ---
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Log the full payload for debugging
  console.log(JSON.stringify(body, null, 2));

  try {
    // Check if it's a valid WhatsApp message notification
    const messagePayload = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contactPayload = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    if (!messagePayload || messagePayload.type !== 'text') {
      // Not a text message or not a message payload, so we can ignore it
      return new NextResponse('OK', { status: 200 });
    }

    const customerPhone = messagePayload.from;
    const customerName = contactPayload.profile.name;
    const messageText = messagePayload.text.body;
    const messageId = messagePayload.id;

    // 1. Find or create the customer
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', customerPhone)
      .single();

    if (customerError && customerError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw customerError;
    }

    if (!customer) {
      const { data: newCustomer, error: newCustomerError } = await supabase
        .from('customers')
        .insert({ phone: customerPhone, name: customerName })
        .select()
        .single();
      if (newCustomerError) throw newCustomerError;
      customer = newCustomer;
    }

    // 2. Find an active conversation or create a new one
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customer.id)
      .neq('status', 'resolved')
      .maybeSingle();

    if (convError) throw convError;

    const newMessage: Message = {
      id: messageId,
      text: messageText,
      sender: 'customer',
      timestamp: new Date(parseInt(messagePayload.timestamp) * 1000).toISOString(),
    };

    if (conversation) {
      // 3a. Add message to existing conversation
      const updatedMessages = [...conversation.messages, newMessage];
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          messages: updatedMessages,
          last_message_preview: messageText,
          unread_count: conversation.unread_count + 1,
          status: 'new', // Re-open if it was assigned
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);
      if (updateError) throw updateError;
    } else {
      // 3b. Create a new conversation
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customer.id,
          messages: [newMessage],
          last_message_preview: messageText,
          unread_count: 1,
          status: 'new',
        });
      if (insertError) throw insertError;
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}