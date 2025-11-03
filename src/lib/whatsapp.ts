export async function sendMessage(to: string, message: { 
  text?: string; 
  attachmentUrl?: string; 
  mimeType?: string; 
  fileName?: string;
  interactive?: {
    body: string;
    buttons: { id: string; title: string }[];
  };
  template?: {
    name: string;
    language: { code: string };
  }
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp environment variables are not set.");
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  let payload: any;

  if (message.template) {
    payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: message.template.name,
        language: {
          code: message.template.language.code,
        },
      },
    };
  } else if (message.interactive) {
    payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: message.interactive.body,
        },
        action: {
          buttons: message.interactive.buttons.map(btn => ({
            type: "reply",
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    };
  } else if (message.attachmentUrl && message.mimeType) {
    const type = message.mimeType.split('/')[0]; // 'image', 'video', 'audio', 'document'
    
    const supportedTypes = ['image', 'video', 'audio', 'document'];
    const messageType = supportedTypes.includes(type) ? type : 'document';

    payload = {
      messaging_product: "whatsapp",
      to: to,
      type: messageType,
      [messageType]: {
        link: message.attachmentUrl,
        ...(message.text && { caption: message.text }),
        ...(messageType === 'document' && message.fileName && { filename: message.fileName }),
      },
    };
  } else if (message.text) {
    payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: message.text,
      },
    };
  } else {
    throw new Error("Message must have text, an attachment, be interactive, or a template.");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error sending WhatsApp message:", errorData);
      throw new Error(`Failed to send message: ${errorData.error.message}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    throw error;
  }
}