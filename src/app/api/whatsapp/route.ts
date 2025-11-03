import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Message, AppSettings } from '@/lib/types';
import { sendMessage } from '@/lib/whatsapp';

// --- DIAGNOSTIC CHECK ---
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL ERROR: Supabase environment variables (URL or Service Role Key) are not set in Vercel.");
  console.error("Please check project settings in Vercel dashboard.");
}
// --- END DIAGNOSTIC CHECK ---

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    let { data: customer, error: customerError } = await supabaseAdmin
      .from('customers').select('*').eq('phone', customerPhone).single();

    if (customerError && customerError.code !== 'PGRST116') throw customerError;

    if (!customer) {
      console.log("Customer not found. Creating new customer.");
      const { data: newCustomer, error: newCustomerError } = await supabaseAdmin
        .from('customers').insert({ phone: customerPhone, name: customerName }).select().single();
      if (newCustomerError) throw newCustomerError;
      customer = newCustomer;
    }

    let { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations').select('*').eq('customer_id', customer.id)
      .neq('status', 'resolved').order('updated_at', { ascending: false }).limit(1).maybeSingle();

    if (convError) throw convError;

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
      if (updateError) throw updateError;
    } else {
      console.log("No active conversation found. Creating new one.");
      const { data: newConversation, error: insertError } = await supabaseAdmin
        .from('conversations')
        .insert({
          customer_id: customer.id,
          messages: [newMessage],
          last_message_preview: messageText,
          unread_count: 1,
          status: 'new',
        }).select().single();
      if (insertError) throw insertError;
      
      // Check if an away message should be sent for this new conversation
      await maybeSendAwayMessage(newConversation.id, customer.phone);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}

async function maybeSendAwayMessage(conversationId: string, customerPhone: string) {
  const { data, error } = await supabaseAdmin
    .from('settings').select('content').eq('id', 'app_settings').single();

  if (error || !data) {
    console.error("Could not fetch app settings for away message.", error);
    return;
  }

  const settings = data.content as AppSettings;
  if (!settings.awayMessage.enabled) return;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

  const { start, end, days } = settings.businessHours;
  const startHour = parseInt(start.split(':')[0]);
  const endHour = parseInt(end.split(':')[0]);

  const isBusinessDay = days.includes(utcDay);
  const isDuringBusinessHours = utcHour >= startHour && utcHour < endHour;

  if (!isBusinessDay || !isDuringBusinessHours) {
    console.log("Outside business hours. Sending away message.");
    try {
      await sendMessage(customerPhone, { text: settings.awayMessage.text });
      
      const awayMessage: Message = {
        id: crypto.randomUUID(),
        text: settings.awayMessage.text,
        sender: 'agent',
        agentId: 'system', // Indicates an automated message
        timestamp: new Date().toISOString(),
      };

      const { data: convData, error: convError } = await supabaseAdmin
        .from('conversations').select('messages').eq('id', conversationId).single();
      
      if (convError) throw convError;

      const updatedMessages = [...convData.messages, awayMessage];
      await supabaseAdmin.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
      console.log("Away message sent and logged to conversation.");
    } catch (e) {
      console.error("Failed to send or log away message:", e);
    }
  }
}