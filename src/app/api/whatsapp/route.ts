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

  console.log("--- WHATSAPP WEBHOOK RECEIVED ---");
  console.log(JSON.stringify(body, null, 2));

  try {
    const messagePayload = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contactPayload = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    if (!messagePayload || messagePayload.type !== 'text') {
      console.log("Webhook ignored: Not a text message payload.");
      return new NextResponse('OK', { status: 200 });
    }

    const customerPhone = messagePayload.from;
    const customerName = contactPayload.profile.name;
    const messageText = messagePayload.text.body;
    const messageId = messagePayload.id;
    console.log(`Processing message from ${customerName} (${customerPhone})`);

    // 1. Find or create the customer
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', customerPhone)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      console.error("Error finding customer:", customerError);
      throw customerError;
    }

    if (!customer) {
      console.log("Customer not found. Creating new customer.");
      const { data: newCustomer, error: newCustomerError } = await supabase
        .from('customers')
        .insert({ phone: customerPhone, name: customerName })
        .select()
        .single();
      if (newCustomerError) {
        console.error("Error creating new customer:", newCustomerError);
        throw newCustomerError;
      }
      customer = newCustomer;
      console.log(`New customer created with ID: ${customer.id}`);
    } else {
      console.log(`Customer found with ID: ${customer.id}`);
    }

    // 2. Find an active conversation or create a new one
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customer.id)
      .neq('status', 'resolved')
      .maybeSingle();

    if (convError) {
      console.error("Error finding conversation:", convError);
      throw convError;
    }

    const newMessage: Message = {
      id: messageId,
      text: messageText,
      sender: 'customer',
      timestamp: new Date(parseInt(messagePayload.timestamp) * 1000).toISOString(),
    };

    if (conversation) {
      console.log(`Existing conversation found (ID: ${conversation.id}). Appending message.`);
      const updatedMessages = [...conversation.messages, newMessage];
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          messages: updatedMessages,
          last_message_preview: messageText,
          unread_count: conversation.unread_count + 1,
          status: 'new',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);
      if (updateError) {
        console.error("Error updating conversation:", updateError);
        throw updateError;
      }
      console.log("Conversation updated successfully.");
    } else {
      console.log("No active conversation found. Creating new one.");
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customer.id,
          messages: [newMessage],
          last_message_preview: messageText,
          unread_count: 1,
          status: 'new',
        });
      if (insertError) {
        console.error("Error inserting new conversation:", insertError);
        throw insertError;
      }
      console.log("New conversation created successfully.");
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}