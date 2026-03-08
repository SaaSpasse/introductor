export const config = { runtime: 'edge' };

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Cache-Control': 'public, max-age=60',
  };

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const url = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!url || !token) {
    return new Response(
      JSON.stringify({ total: 0 }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const res = await fetch(`${url}/get/stats:total_intros`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const total = parseInt(data.result) || 0;

    return new Response(
      JSON.stringify({ total }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch {
    return new Response(
      JSON.stringify({ total: 0 }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
