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

async function downloadWhatsappMedia(mediaId: string): Promise<{ fileBuffer: Buffer, mimeType: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN is not set.");

  const urlResponse = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!urlResponse.ok) throw new Error('Failed to get media URL from WhatsApp');
  const urlData = await urlResponse.json();
  const mediaUrl = urlData.url;
  const mimeType = urlData.mime_type;

  if (!mediaUrl) throw new Error("Media URL not found in WhatsApp response.");

  const mediaResponse = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaResponse.ok) throw new Error('Failed to download media file from WhatsApp');
  
  const fileBuffer = Buffer.from(await mediaResponse.arrayBuffer());

  return { fileBuffer, mimeType };
}

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
    if (!messagePayload) {
      console.log("Webhook ignored: Not a message payload.");
      return new NextResponse('OK', { status: 200 });
    }

    const contactPayload = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    const customerPhone = messagePayload.from;
    const customerName = contactPayload?.profile?.name || `Customer ${customerPhone.slice(-4)}`;
    
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

    if (customer && customer.is_blocked) {
      console.log(`Message from blocked customer ${customer.phone}. Sending auto-reply.`);
      const blockedReplyText = "Sizin Payonix ilə Whatsapp üzərərindən əlaqəniz məhdudlaşdırılmışdır. Müraciətinizə Qaynar xətt *2021 və ya Mobil tətbiq üzərindən Chat-a yazaraq davam edə bilərsiniz.";
      try {
        await sendMessage(customer.phone, { text: blockedReplyText });
        console.log(`Auto-reply sent to ${customer.phone}.`);
      } catch (error) {
        console.error(`Failed to send blocked reply to ${customer.phone}:`, error);
      }
      return new NextResponse('OK', { status: 200 });
    }

    let newMessage: Message | null = null;
    let lastMessagePreview = "";
    const messageType = messagePayload.type;

    if (messageType === 'text') {
      lastMessagePreview = messagePayload.text.body;
      newMessage = {
        id: messagePayload.id,
        text: lastMessagePreview,
        sender: 'customer',
        timestamp: new Date(parseInt(messagePayload.timestamp) * 1000).toISOString(),
      };
    } else if (messageType === 'interactive') {
      const interactivePayload = messagePayload.interactive;
      if (interactivePayload && interactivePayload.type === 'button_reply' && interactivePayload.button_reply) {
        lastMessagePreview = interactivePayload.button_reply.title;
        newMessage = {
          id: messagePayload.id,
          text: lastMessagePreview,
          sender: 'customer',
          timestamp: new Date(parseInt(messagePayload.timestamp) * 1000).toISOString(),
        };
      } else {
        const interactiveType = interactivePayload ? interactivePayload.type : 'unknown';
        console.log(`Webhook ignored: Unsupported or malformed interactive message type "${interactiveType}".`);
        return new NextResponse('OK', { status: 200 });
      }
    } else if (['image', 'video', 'audio', 'sticker', 'document'].includes(messageType)) {
        let mediaId: string, fileName: string | undefined, previewText: string, caption: string | undefined;
        switch (messageType) {
            case 'image': mediaId = messagePayload.image.id; previewText = '📷 Image'; caption = messagePayload.image.caption; break;
            case 'video': mediaId = messagePayload.video.id; previewText = '📹 Video'; caption = messagePayload.video.caption; break;
            case 'audio': mediaId = messagePayload.audio.id; previewText = '🎤 Voice Message'; break;
            case 'sticker': mediaId = messagePayload.sticker.id; previewText = 'Sticker'; break;
            case 'document': mediaId = messagePayload.document.id; fileName = messagePayload.document.filename; previewText = `📄 ${fileName || 'Document'}`; caption = messagePayload.document.caption; break;
            default: return new NextResponse('OK', { status: 200 });
        }

        const { fileBuffer, mimeType } = await downloadWhatsappMedia(mediaId);
        const fileExt = mimeType.split('/')[1] || 'bin';
        const finalFileName = fileName || `${mediaId}.${fileExt}`;
        const filePath = `customer-uploads/${customer.id}/${finalFileName}`;

        const { error: uploadError } = await supabaseAdmin.storage.from('attachments').upload(filePath, fileBuffer, { contentType: mimeType, upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage.from('attachments').getPublicUrl(filePath);
        
        lastMessagePreview = caption ? `${previewText}: ${caption}` : previewText;
        newMessage = {
            id: messagePayload.id, text: caption || '', sender: 'customer', timestamp: new Date(parseInt(messagePayload.timestamp) * 1000).toISOString(),
            attachment: { url: publicUrl, fileName: finalFileName, fileType: mimeType },
        };
    } else {
      console.log(`Webhook ignored: Unsupported message type "${messageType}".`);
      return new NextResponse('OK', { status: 200 });
    }

    let { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations').select('*').eq('customer_id', customer.id).neq('status', 'resolved').order('updated_at', { ascending: false }).limit(1).maybeSingle();

    if (convError) throw convError;

    if (conversation) {
      console.log(`Existing conversation found (ID: ${conversation.id}). Appending message.`);
      const updatedMessages = [...conversation.messages, newMessage];
      const { error: updateError } = await supabaseAdmin.from('conversations').update({
          messages: updatedMessages,
          last_message_preview: lastMessagePreview,
          unread_count: (conversation.unread_count || 0) + 1,
          status: 'new',
          // CRITICAL FIX: This timestamp update is the trigger for the real-time UI sort.
          updated_at: new Date().toISOString(),
        }).eq('id', conversation.id);
      if (updateError) throw updateError;
    } else {
      console.log("No active conversation found. Creating new one.");
      const { data: newConversation, error: insertError } = await supabaseAdmin.from('conversations').insert({
          customer_id: customer.id,
          messages: [newMessage],
          last_message_preview: lastMessagePreview,
          unread_count: 1,
          status: 'new',
        }).select().single();
      if (insertError) throw insertError;
      
      const welcomeMessageSent = await maybeSendWelcomeMessage(customer.phone);
      if (!welcomeMessageSent) {
        await maybeSendAwayMessage(newConversation.id, customer.phone);
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}

async function maybeSendWelcomeMessage(customerPhone: string): Promise<boolean> {
  try {
    console.log("Sending welcome template message.");
    await sendMessage(customerPhone, {
      template: {
        name: "welcome_start",
        language: { code: "az" },
      },
    });
    console.log("Welcome template sent successfully.");
    return true;
  } catch (e) {
    console.error("Failed to send welcome template:", e);
    return false;
  }
}

async function maybeSendAwayMessage(conversationId: string, customerPhone: string) {
  const { data, error } = await supabaseAdmin.from('settings').select('content').eq('id', 'app_settings').single();
  if (error || !data) {
    console.error("Could not fetch app settings for away message.", error);
    return;
  }

  const settings = data.content as AppSettings;
  if (!settings.awayMessage.enabled) return;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();

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
        id: crypto.randomUUID(), text: settings.awayMessage.text, sender: 'agent',
        agentId: 'system', timestamp: new Date().toISOString(),
      };

      const { data: convData, error: convError } = await supabaseAdmin.from('conversations').select('messages').eq('id', conversationId).single();
      if (convError) throw convError;

      const updatedMessages = [...convData.messages, awayMessage];
      await supabaseAdmin.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
      console.log("Away message sent and logged to conversation.");
    } catch (e) {
      console.error("Failed to send or log away message:", e);
    }
  }
}