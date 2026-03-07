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

const SYSTEM_PROMPT = `You are Introductor, an expert at crafting warm, human email introductions.

RULES:
1. FORMAT - Start with "Hi [Name]," greeting. Use short paragraphs. Keep it under 150 words.
2. TONE - Match the requested tone: casual (friendly, first-name), warm (professional but personable), formal (respectful, full names).
3. PLAIN TEXT ONLY - No markdown, no bold, no links, no formatting. Write it as a plain text email.
4. LANGUAGE - Write in the requested language (en=English, fr=French).
5. SUBJECT - Output a subject line FIRST on its own line, prefixed with "Subject: ". Format: "Intro: [Name A] ↔ [Name B] — [context in 3-4 words]"
6. BCC - End with a line like "Feel free to move me to BCC" or equivalent.
7. NO SIGNATURE - Never include a sign-off name or signature block. No "Best," no "Cheers," nothing after the BCC line.

OUTPUT FORMAT:
Subject: [subject line]

[email body]`;

function extractPersonName(description) {
  // Extract the name portion before the first comma or descriptor
  const trimmed = description.trim();
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx > 0) return trimmed.slice(0, commaIdx).trim();
  // Fallback: take first two words (likely first + last name)
  const words = trimmed.split(/\s+/);
  return words.slice(0, 2).join(' ');
}

async function searchBrave(personDescription, braveApiKey) {
  const query = personDescription.trim().slice(0, 150) + ' LinkedIn';
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': braveApiKey }
  });

  if (!res.ok) {
    throw new Error(`Brave API error: ${res.status}`);
  }

  const data = await res.json();
  const results = data?.web?.results || [];

  // Build a concise summary from titles and descriptions
  const sources = results.map(r => r.url).filter(Boolean);
  const snippets = results
    .map(r => `${r.title || ''} - ${r.description || ''}`)
    .filter(s => s.length > 3);

  // Take the most relevant snippets and build a 1-2 sentence summary
  const combined = snippets.slice(0, 3).join('. ');
  const summary = combined.length > 300 ? combined.slice(0, 300) + '...' : combined;

  return { summary: summary || 'No additional information found.', sources: sources.slice(0, 3) };
}

function buildUserPrompt({ personA, personB, why, yourName, personal, searchResultA, searchResultB }) {
  let prompt = '';

  if (searchResultA || searchResultB) {
    if (searchResultA) {
      prompt += `RESEARCH ON PERSON A:\n${searchResultA.summary}\n\n`;
    }
    if (searchResultB) {
      prompt += `RESEARCH ON PERSON B:\n${searchResultB.summary}\n\n`;
    }
    prompt += '---\n\n';
  }

  prompt += `Person A: ${personA}\n`;
  prompt += `Person B: ${personB}\n`;
  prompt += `Why connect them: ${why}\n`;
  prompt += `Your name: ${yourName}\n`;
  if (personal) {
    prompt += `Personal touch: ${personal}\n`;
  }
  prompt += '\nWrite the introduction email.';

  return prompt;
}

export default async function handler(request) {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { personA, personB, why, tone, language, yourName, personal } = await request.json();

    if (!personA || !personB || !why) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: personA, personB, why' }),
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

    const braveApiKey = process.env.BRAVE_API_KEY;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (event) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Start the async pipeline
    (async () => {
      try {
        let searchResultA = null;
        let searchResultB = null;
        const nameA = extractPersonName(personA);
        const nameB = extractPersonName(personB);

        // Phase 1: Brave Search (parallel, if API key available)
        if (braveApiKey) {
          // Emit search_start events
          await sendEvent({ type: 'search_start', person: nameA });
          await sendEvent({ type: 'search_start', person: nameB });

          const [resultA, resultB] = await Promise.all([
            searchBrave(personA, braveApiKey).catch(() => null),
            searchBrave(personB, braveApiKey).catch(() => null)
          ]);

          if (resultA) {
            searchResultA = resultA;
            await sendEvent({ type: 'search_result', person: nameA, summary: resultA.summary, sources: resultA.sources });
          } else {
            await sendEvent({ type: 'search_result', person: nameA, summary: 'Could not find additional information.', sources: [] });
          }

          if (resultB) {
            searchResultB = resultB;
            await sendEvent({ type: 'search_result', person: nameB, summary: resultB.summary, sources: resultB.sources });
          } else {
            await sendEvent({ type: 'search_result', person: nameB, summary: 'Could not find additional information.', sources: [] });
          }
        }

        // Phase 2: Build prompt and call Sonnet
        const userPrompt = buildUserPrompt({
          personA,
          personB,
          why,
          yourName: yourName || 'Me',
          personal: personal || '',
          searchResultA,
          searchResultB
        });

        const systemPrompt = SYSTEM_PROMPT
          + (tone ? `\n\nREQUESTED TONE: ${tone}` : '')
          + (language ? `\nREQUESTED LANGUAGE: ${language}` : '');

        await sendEvent({ type: 'writing' });

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-latest',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            stream: true
          })
        });

        if (!anthropicRes.ok) {
          const errBody = await anthropicRes.text().catch(() => '');
          await sendEvent({ type: 'error', message: `Upstream error: ${anthropicRes.status} ${errBody.slice(0, 200)}` });
          await sendEvent({ type: 'done' });
          await writer.close();
          return;
        }

        // Phase 3: Stream the Anthropic response
        const reader = anthropicRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let subjectSent = false;

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
                  const chunk = event.delta.text;
                  fullText += chunk;

                  // Check if we have the subject line complete but not yet emitted
                  if (!subjectSent && fullText.includes('\n')) {
                    const firstNewline = fullText.indexOf('\n');
                    const firstLine = fullText.slice(0, firstNewline).trim();

                    if (firstLine.startsWith('Subject:')) {
                      const subjectContent = firstLine.replace(/^Subject:\s*/, '');
                      await sendEvent({ type: 'subject', content: subjectContent });
                      subjectSent = true;

                      // Send remaining text after subject line (skip leading newlines)
                      const remaining = fullText.slice(firstNewline).replace(/^\n+/, '');
                      if (remaining) {
                        await sendEvent({ type: 'text', content: remaining });
                      }
                      continue;
                    }
                  }

                  // If subject already sent, stream text chunks directly
                  if (subjectSent) {
                    await sendEvent({ type: 'text', content: chunk });
                  }
                  // If subject not yet sent, we buffer (fullText accumulates)
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        }

        // Edge case: if the full response never had a newline (unlikely but safe)
        if (!subjectSent && fullText.length > 0) {
          const firstLine = fullText.split('\n')[0]?.trim() || '';
          if (firstLine.startsWith('Subject:')) {
            await sendEvent({ type: 'subject', content: firstLine.replace(/^Subject:\s*/, '') });
            const rest = fullText.slice(fullText.indexOf('\n') + 1).replace(/^\n+/, '');
            if (rest) await sendEvent({ type: 'text', content: rest });
          } else {
            await sendEvent({ type: 'text', content: fullText });
          }
        }

        await sendEvent({ type: 'done' });
      } catch (err) {
        try {
          await sendEvent({ type: 'error', message: err.message || 'Internal error' });
          await sendEvent({ type: 'done' });
        } catch { /* writer may be closed */ }
      } finally {
        try { await writer.close(); } catch { /* already closed */ }
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
      { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) } }
    );
  }
}

