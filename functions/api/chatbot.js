import { json } from '../../lib/shared.js';

const SYSTEM = `You are the support assistant for Al-Bai' Wa Al-Shiraa, a marketplace of shops and riders in Lahore, Pakistan.
Answer briefly and politely, in English or Roman Urdu to match the user.
Topics you can help with: how to place an order, cash on delivery (COD) and online payment, delivery, how shops and riders join, and how to contact support on WhatsApp +92-333-4451514.
Never invent prices, stock, order status or policies. If you don't know, say so and suggest WhatsApp support.
Never ask for passwords or payment card details.`;

export async function onRequestPost({ request, env }) {
  try {
    const { message, history = [] } = await request.json();
    const text = String(message || '').trim().slice(0, 500);
    if (!text) return json(400, { error: 'Empty message' });
    const contents = history.slice(-8).map((m) => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, 500) }]
    }));
    contents.push({ role: 'user', parts: [{ text }] });
    const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents })
    });
    if (!r.ok) return json(502, { error: 'Assistant is unavailable right now' });
    const data = await r.json();
    return json(200, { reply: data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, please contact WhatsApp support.' });
  } catch (e) {
    console.error('chatbot', e.message);
    return json(500, { error: 'Server error' });
  }
}
