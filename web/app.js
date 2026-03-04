// --- System prompt ---
const SYSTEM_PROMPT = `You are Introductor, an expert at crafting warm, human email introductions.

Your job: generate a warm intro email that connects two people. Follow these rules strictly:

1. BREVITY - Max 150 words. Scannable in 15 seconds.
2. NUGGETS - 1-2 credibility data points per person. Not a resume.
3. PLAIN TEXT ONLY - No markdown, no bold, no links, no formatting. This is a plain text email.
4. TONE - Match the requested tone (casual/warm/formal). Sound human, not corporate.
5. SUBJECT - Specific. Format: "Intro: [Name A] ↔ [Name B] — [context in 3-4 words]"
6. BCC - End with a line like "Feel free to move me to BCC" or equivalent.
7. NO SIGNATURE - Never include a sign-off name or signature block. No "Best," no "Cheers," nothing.
8. STRUCTURE - Two short blocks: one for each person with their nugget.

Output format:
- First line: SUBJECT: [the subject line]
- Then a blank line
- Then the email body (plain text, no markdown)

Write the email in the requested language. Match the tone exactly.`;

// --- State management ---
const STATE_KEY = 'introductor_state';

const defaultState = {
  currentStep: 1,
  personA: '',
  personB: '',
  why: '',
  tone: 'warm',
  language: 'en',
  yourName: '',
  personal: ''
};

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

let state = loadState();
let lastResult = null;

// --- Prompt builder ---
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

// --- Name extraction for answer piping ---
function extractFirstName(text) {
  if (!text.trim()) return '';
  const firstLine = text.trim().split('\n')[0];
  const match = firstLine.match(/^([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)/);
  return match ? match[1] : firstLine.split(/[,\-\n]/)[0].trim().split(' ')[0];
}

function updateWhyLabel() {
  const nameA = extractFirstName(state.personA);
  const nameB = extractFirstName(state.personB);
  const label = document.getElementById('why-label');
  if (nameA && nameB) {
    label.textContent = `Why connect ${nameA} and ${nameB}?`;
  } else {
    label.textContent = 'Why connect them?';
  }
}

// --- Wizard navigation ---
function goToStep(n) {
  if (n < 1 || n > 5) return;
  state.currentStep = n;
  saveState();

  const track = document.getElementById('wizard-track');
  const stepHeight = document.querySelector('.step').offsetHeight;
  track.style.transform = `translateY(-${(n - 1) * stepHeight}px)`;

  // Progress
  const progress = document.getElementById('progress');
  if (n <= 4) {
    progress.textContent = `${n} / 4`;
    progress.classList.remove('hidden');
  } else {
    progress.classList.add('hidden');
  }

  // Answer piping on step 3
  if (n === 3) updateWhyLabel();

  // Auto-focus
  const step = document.querySelector(`.step[data-step="${n}"]`);
  const focusable = step.querySelector('textarea, input[type="text"]');
  if (focusable) setTimeout(() => focusable.focus(), 300);
}

// Recalculate on resize
function recalcSteps() {
  const stepHeight = document.querySelector('.step')?.offsetHeight;
  if (!stepHeight) return;
  document.querySelectorAll('.step').forEach(s => {
    s.style.height = `${stepHeight}px`;
  });
  const track = document.getElementById('wizard-track');
  track.style.transform = `translateY(-${(state.currentStep - 1) * stepHeight}px)`;
}

// --- Validation ---
function validateStep(n) {
  if (n === 1 && !state.personA.trim()) { shakeField('person-a'); return false; }
  if (n === 2 && !state.personB.trim()) { shakeField('person-b'); return false; }
  if (n === 3 && !state.why.trim()) { shakeField('why'); return false; }
  return true;
}

function shakeField(id) {
  const el = document.getElementById(id);
  el.classList.add('shake');
  el.focus();
  setTimeout(() => el.classList.remove('shake'), 500);
}

// --- Streaming parsers ---
function parseOutputLive(text) {
  const lines = text.split('\n');
  let subject = '';
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith('subject:')) {
      subject = lines[i].replace(/^subject:\s*/i, '').trim();
      bodyStart = i + 1;
      while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
      break;
    }
  }

  const body = lines.slice(bodyStart).join('\n').trim();
  return { subject, body };
}

function renderStreaming(fullText) {
  const { subject, body } = parseOutputLive(fullText);
  if (subject) document.getElementById('subject-text').textContent = subject;
  document.getElementById('intro-body').textContent = body;
}

function finalizeOutput(fullText) {
  const { subject, body } = parseOutputLive(fullText);
  document.getElementById('subject-text').textContent = subject;
  document.getElementById('intro-body').textContent = body;
  lastResult = { subject, body };
}

// --- Free tier: via edge function ---
async function streamFromEdgeFunction(prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: SYSTEM_PROMPT, prompt })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error('Daily limit reached (5/day). Switch to "Your API key" for unlimited access.');
    }
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  await processSSE(res.body);
}

// --- SSE processor ---
async function processSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const chunk = JSON.parse(data);
        if (chunk) {
          fullText += chunk;
          renderStreaming(fullText);
        }
      } catch { continue; }
    }
  }

  finalizeOutput(fullText);
}

// --- Generate ---
async function generate() {
  syncStateFromDOM();
  goToStep(5);

  document.getElementById('subject-text').textContent = '';
  const introBody = document.getElementById('intro-body');
  introBody.textContent = '';
  introBody.classList.add('streaming');
  introBody.contentEditable = 'false';
  hideError();

  const generateBtn = document.getElementById('generate-btn');
  generateBtn.disabled = true;

  try {
    await streamFromEdgeFunction(buildPrompt(state));
  } catch (err) {
    showError(err.message);
  } finally {
    introBody.classList.remove('streaming');
    introBody.contentEditable = 'true';
    generateBtn.disabled = false;
  }
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}

// --- DOM sync ---
function syncStateFromDOM() {
  state.personA = document.getElementById('person-a').value;
  state.personB = document.getElementById('person-b').value;
  state.why = document.getElementById('why').value;
  state.personal = document.getElementById('personal').value;
  state.yourName = document.getElementById('your-name').value;
  saveState();
}

function restoreDOM() {
  document.getElementById('person-a').value = state.personA;
  document.getElementById('person-b').value = state.personB;
  document.getElementById('why').value = state.why;
  document.getElementById('personal').value = state.personal;
  document.getElementById('your-name').value = state.yourName;

  // Pills
  setActivePill('tone-pills', state.tone);
  setActivePill('lang-pills', state.language);

  // Personal touch
  if (state.personal) {
    document.getElementById('personal').classList.remove('hidden');
  }
}

function setActivePill(groupId, value) {
  document.getElementById(groupId).querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.value === value);
  });
}

// --- Event wiring ---
function wireEvents() {
  // Next buttons
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.closest('.step').dataset.step);
      if (validateStep(step)) goToStep(parseInt(btn.dataset.next));
    });
  });

  // Back buttons
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.back)));
  });

  // Cmd+Enter on textareas
  document.querySelectorAll('.step textarea').forEach(ta => {
    ta.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const step = parseInt(ta.closest('.step').dataset.step);
        if (validateStep(step)) {
          const nextBtn = ta.closest('.step').querySelector('.btn-next');
          if (nextBtn) goToStep(parseInt(nextBtn.dataset.next));
        }
      }
    });
  });

  // Pill selections
  document.querySelectorAll('.pills').forEach(group => {
    group.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (group.id === 'tone-pills') state.tone = pill.dataset.value;
      if (group.id === 'lang-pills') state.language = pill.dataset.value;
      saveState();
    });
  });

  // Personal touch expander
  document.getElementById('personal-toggle').addEventListener('click', () => {
    const ta = document.getElementById('personal');
    const isHidden = ta.classList.contains('hidden');
    ta.classList.toggle('hidden');
    const toggle = document.getElementById('personal-toggle');
    toggle.textContent = isHidden ? '- Remove personal touch' : '+ Add personal touch';
    if (isHidden) ta.focus();
  });

  // Input sync
  ['person-a', 'person-b', 'why', 'personal', 'your-name'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      state[key] = el.value;
      saveState();
    });
  });

  // Generate
  document.getElementById('generate-btn').addEventListener('click', () => generate());

  // Output actions
  document.getElementById('copy-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-text').textContent;
    const body = document.getElementById('intro-body').innerText;
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
      const btn = document.getElementById('copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy all'; }, 2000);
    });
  });

  document.getElementById('copy-subject').addEventListener('click', () => {
    const subject = document.getElementById('subject-text').textContent;
    navigator.clipboard.writeText(subject).then(() => {
      const btn = document.getElementById('copy-subject');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
  });

  document.getElementById('email-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-text').textContent;
    const body = document.getElementById('intro-body').innerText;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  document.getElementById('regen-btn').addEventListener('click', () => generate());

  document.getElementById('start-over-btn').addEventListener('click', () => {
    const keep = { yourName: state.yourName };
    state = { ...defaultState, ...keep };
    saveState();
    restoreDOM();
    goToStep(1);
  });

  // Resize handler
  window.addEventListener('resize', () => recalcSteps());
}

// --- Init ---
function init() {
  restoreDOM();
  wireEvents();
  // Don't resume to step 5 (output) on reload - go to step 4 max
  const resumeStep = Math.min(state.currentStep, 4);
  goToStep(resumeStep);
}

document.addEventListener('DOMContentLoaded', init);
