import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Message } from '@/lib/types';

// --- DIAGNOSTIC CHECK ---
// Check if the required environment variables are set. This will make debugging easier.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL ERROR: Supabase environment variables (URL or Service Role Key) are not set in Vercel.");
  console.error("Please check project settings in Vercel dashboard.");
}
// --- END DIAGNOSTIC CHECK ---

// Create a new Supabase client with the service role key to bypass RLS
// This is safe because this code only runs on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    console.error('Webhook verification failed. Check WHATSAPP_VERIFY_TOKEN.');
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
    
    if (!messagePayload || messagePayload.type !== 'text') {
      console.log("Webhook ignored: Not a text message payload.");
      return new NextResponse('OK', { status: 200 });
    }

    const contactPayload = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    const customerPhone = messagePayload.from;
    const customerName = contactPayload?.profile?.name || `Customer ${customerPhone.slice(-4)}`;
    const messageText = messagePayload.text.body;
    const messageId = messagePayload.id;
    
    console.log(`Processing message from ${customerName} (${customerPhone})`);

    // 1. Find or create the customer using the admin client
    let { data: customer, error: customerError } = await supabaseAdmin
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
      const { data: newCustomer, error: newCustomerError } = await supabaseAdmin
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
    } else if (contactPayload && customer.name !== contactPayload.profile.name) {
      // If customer exists and we received an updated name, update it
      console.log(`Updating customer name for ${customer.phone}`);
      const { error: updateCustomerError } = await supabaseAdmin
        .from('customers')
        .update({ name: contactPayload.profile.name })
        .eq('id', customer.id);
      if (updateCustomerError) {
        console.error("Error updating customer name:", updateCustomerError);
      }
    } else {
      console.log(`Customer found with ID: ${customer.id}`);
    }

    // 2. Find the most recent active conversation or create a new one
    let { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('customer_id', customer.id)
      .neq('status', 'resolved')
      .order('updated_at', { ascending: false })
      .limit(1)
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
      const { error: updateError } = await supabaseAdmin
        .from('conversations')
        .update({
          messages: updatedMessages,
          last_message_preview: messageText,
          unread_count: (conversation.unread_count || 0) + 1,
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
      const { error: insertError } = await supabaseAdmin
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