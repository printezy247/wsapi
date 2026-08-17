const axios = require('axios');

class WhatsAppClient {
  constructor({ accessToken, phoneNumberId, apiBase, apiVersion }) {
    if (!accessToken) throw new Error('WHATSAPP_ACCESS_TOKEN is required');
    if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is required');

    this.http = axios.create({
      baseURL: `${apiBase}/${apiVersion}/${phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  // Required for the first message to a contact, or any message sent
  // outside the 24h customer-service window. Template must already be
  // approved in the Waboom/Meta dashboard.
  async sendTemplateMessage(to, templateName, languageCode, bodyParams = []) {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(bodyParams.length
          ? { components: [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }] }
          : {}),
      },
    };
    return this._send(payload);
  }

  // Only deliverable if the contact messaged you in the last 24h.
  async sendTextMessage(to, body) {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    };
    return this._send(payload);
  }

  async _send(payload) {
    try {
      const { data } = await this.http.post('/messages', payload);
      return { ok: true, data };
    } catch (err) {
      const apiError = err.response?.data?.error;
      return {
        ok: false,
        status: err.response?.status,
        error: apiError || { message: err.message },
      };
    }
  }
}

module.exports = { WhatsAppClient };
