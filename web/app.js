const SYSTEM_PROMPT = `You are Introductor, an expert at crafting warm, human email introductions.

Your job: generate a warm intro email that connects two people. Follow these rules strictly:

1. BREVITY - Max 150 words. Scannable in 15 seconds.
2. NUGGETS - 1-2 credibility data points per person. Not a resume.
3. LINKS - Hyperlink URLs on relevant words, never paste raw URLs.
4. TONE - Match the requested tone (casual/warm/formal). Sound human, not corporate.
5. SUBJECT - Specific. Format: "Intro: [Name A] ↔ [Name B] - [context in 3-4 words]"
6. BCC - End with "you can move me to BCC" or equivalent.
7. NO SIGNATURE - Never include a sign-off name or signature block.
8. STRUCTURE - Two blocks: one for each person with their nugget and a link if available.

Output format:
- First line: SUBJECT: [the subject line]
- Then a blank line
- Then the email body

Write the email in the requested language. Match the tone exactly.`;

function buildPrompt(data) {
  let prompt = `Generate a warm email introduction.\n\n`;
  prompt += `**Person A:** ${data.personA}\n\n`;
  prompt += `**Person B:** ${data.personB}\n\n`;
  prompt += `**Why connect them:** ${data.why}\n\n`;
  if (data.personal) {
    prompt += `**Personal touch from the introducer:** ${data.personal}\n\n`;
  }
  prompt += `**Tone:** ${data.tone}\n`;
  prompt += `**Language:** ${data.language === 'fr' ? 'French (Quebec)' : 'English'}\n`;
  if (data.yourName) {
    prompt += `**Introducer's name:** ${data.yourName}\n`;
  }
  return prompt;
}

async function callAnthropic(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }

  const json = await res.json();
  return json.content[0].text;
}

async function callOpenAI(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }

  const json = await res.json();
  return json.choices[0].message.content;
}

function parseOutput(text) {
  const lines = text.trim().split('\n');
  let subject = '';
  let body = '';
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().startsWith('subject:')) {
      subject = line.replace(/^subject:\s*/i, '').trim();
      bodyStart = i + 1;
      // Skip blank lines after subject
      while (bodyStart < lines.length && lines[bodyStart].trim() === '') {
        bodyStart++;
      }
      break;
    }
  }

  body = lines.slice(bodyStart).join('\n').trim();

  return { subject, body };
}

function buildMailtoLink(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// DOM
const form = document.getElementById('intro-form');
const output = document.getElementById('output');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const subjectLine = document.getElementById('subject-line');
const introText = document.getElementById('intro-text');
const copyBtn = document.getElementById('copy-btn');
const emailBtn = document.getElementById('email-btn');
const regenBtn = document.getElementById('regen-btn');
const generateBtn = document.getElementById('generate-btn');

let lastData = null;
let lastResult = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await generate();
});

regenBtn.addEventListener('click', async () => {
  if (lastData) await generate();
});

copyBtn.addEventListener('click', () => {
  if (!lastResult) return;
  const text = `Subject: ${lastResult.subject}\n\n${lastResult.body}`;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  });
});

emailBtn.addEventListener('click', () => {
  if (!lastResult) return;
  window.location.href = buildMailtoLink(lastResult.subject, lastResult.body);
});

async function generate() {
  const apiKey = document.getElementById('api-key').value.trim();
  const provider = document.getElementById('provider').value;

  if (!apiKey) {
    showError('Please enter your API key.');
    return;
  }

  const personA = document.getElementById('person-a').value.trim();
  const personB = document.getElementById('person-b').value.trim();
  const why = document.getElementById('why').value.trim();

  if (!personA || !personB || !why) {
    showError('Please fill in Person A, Person B, and why you want to connect them.');
    return;
  }

  lastData = {
    personA,
    personB,
    why,
    personal: document.getElementById('personal').value.trim(),
    tone: document.getElementById('tone').value,
    language: document.getElementById('language').value,
    yourName: document.getElementById('your-name').value.trim()
  };

  const prompt = buildPrompt(lastData);

  output.classList.add('hidden');
  errorDiv.classList.add('hidden');
  loading.classList.remove('hidden');
  generateBtn.disabled = true;

  try {
    let result;
    if (provider === 'anthropic') {
      result = await callAnthropic(apiKey, prompt);
    } else {
      result = await callOpenAI(apiKey, prompt);
    }

    lastResult = parseOutput(result);
    subjectLine.textContent = `Subject: ${lastResult.subject}`;
    introText.textContent = lastResult.body;

    loading.classList.add('hidden');
    output.classList.remove('hidden');
  } catch (err) {
    loading.classList.add('hidden');
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
}

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}
