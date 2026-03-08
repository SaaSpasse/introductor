export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://introductor.vercel.app',
  'https://introductor.ai',
  'http://localhost:3000',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function generateId() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default async function handler(request) {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const url = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!url || !token) {
    return new Response(
      JSON.stringify({ error: 'Share feature not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const { subject, body, fromName } = await request.json();

    if (!subject || !body || !fromName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, body, fromName' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const id = generateId();
    const key = `intro:${id}`;
    const data = JSON.stringify({ subject, body, fromName, createdAt: Date.now() });

    // SET with 30-day TTL (2592000 seconds)
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(data)}/EX/2592000`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to store intro');
    }

    return new Response(
      JSON.stringify({ id, url: `https://introductor.ai/i/${id}` }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
