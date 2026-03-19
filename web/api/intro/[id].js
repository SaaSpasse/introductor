export const config = { runtime: 'edge' };

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(request) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];

  if (!id || id.length < 5) {
    return new Response('Not found', { status: 404 });
  }

  const redisUrl = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return new Response('Not configured', { status: 500 });
  }

  try {
    const res = await fetch(`${redisUrl}/get/${encodeURIComponent(`intro:${id}`)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });

    const data = await res.json();

    if (!data.result) {
      return new Response(renderNotFound(), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const intro = JSON.parse(data.result);
    return new Response(renderIntro(intro, id), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('Server error', { status: 500 });
  }
}

function renderIntro({ subject, body, fromName }, id) {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(body);
  const safeName = escapeHtml(fromName);
  const shareUrl = `https://introductor.ai/i/${id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject} — Introductor</title>
  <meta name="description" content="A warm introduction crafted by ${safeName} via Introductor">
  <meta property="og:title" content="${safeSubject}">
  <meta property="og:description" content="A warm introduction by ${safeName}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${shareUrl}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✉️</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #FAF8F5; color: #2A2520; line-height: 1.6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; -webkit-font-smoothing: antialiased; }
    .card { max-width: 560px; width: 100%; }
    .subject { font-family: 'Fraunces', Georgia, serif; font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.02em; }
    .body { white-space: pre-wrap; font-size: 0.95rem; line-height: 1.8; padding: 24px; background: #FEFDFB; border: 1px solid #EBE6DF; border-radius: 2px; margin-bottom: 20px; }
    .meta { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: #B5ADA5; text-align: center; letter-spacing: 0.03em; }
    .meta a { color: #B5706A; text-decoration: none; font-weight: 500; }
    .meta a:hover { text-decoration: underline; }
    .from { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #8C8178; margin-bottom: 20px; letter-spacing: 0.02em; }
  </style>
</head>
<body>
  <div class="card">
    <div class="subject">${safeSubject}</div>
    <div class="from">From ${safeName}</div>
    <div class="body">${safeBody}</div>
    <div class="meta">Crafted with <a href="https://introductor.ai">Introductor</a></div>
  </div>
</body>
</html>`;
}

function renderNotFound() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not found — Introductor</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✉️</text></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #FAF8F5; color: #2A2520; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; -webkit-font-smoothing: antialiased; }
    h1 { font-family: 'Fraunces', serif; font-size: 1.5rem; margin-bottom: 12px; letter-spacing: -0.02em; }
    p { font-family: 'JetBrains Mono', monospace; color: #8C8178; font-size: 0.75rem; letter-spacing: 0.02em; }
    a { color: #B5706A; text-decoration: none; }
  </style>
</head>
<body>
  <div>
    <h1>Introduction not found</h1>
    <p>This link may have expired. <a href="https://introductor.ai">Create a new one</a></p>
  </div>
</body>
</html>`;
}
