const rateLimitMap = new Map();
const DAILY_LIMIT = 5;

function getRateLimitKey(ip) {
  const today = new Date().toISOString().slice(0, 10);
  return `${ip}:${today}`;
}

function checkRateLimit(ip) {
  // Clean old entries
  const today = new Date().toISOString().slice(0, 10);
  for (const [k] of rateLimitMap) {
    if (!k.endsWith(today)) rateLimitMap.delete(k);
  }

  const key = getRateLimitKey(ip);
  const count = rateLimitMap.get(key) || 0;
  if (count >= DAILY_LIMIT) return false;
  rateLimitMap.set(key, count + 1);
  return true;
}

function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request) {
  try {
    const ip = getClientIP(request);

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached (5/day). Use your own API key for unlimited access.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { system, prompt } = await request.json();

    if (!system || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing system or prompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    });

    if (!anthropicRes.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${anthropicRes.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Re-stream: parse Anthropic SSE, re-emit simplified chunks
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  await writer.write(encoder.encode(`data: ${JSON.stringify(event.delta.text)}\n\n`));
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch {
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...corsHeaders
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}
