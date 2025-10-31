export async function sendMessage(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp environment variables are not set.");
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: {
      body: text,
    },
  };

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