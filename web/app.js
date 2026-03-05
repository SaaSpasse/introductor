// --- State management ---
const STATE_KEY = 'introductor_state';

const defaultState = {
  currentStep: 0,
  personA: '',
  personB: '',
  why: '',
  tone: 'warm',
  language: 'en',
  yourName: '',
  personal: '',
  emailA: '',
  emailB: ''
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
let firstTextReceived = false;

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
  if (n < 0 || n > 5) return;
  state.currentStep = n;
  saveState();

  const track = document.getElementById('wizard-track');
  const stepHeight = document.querySelector('.step').offsetHeight;
  track.style.transform = `translateY(-${n * stepHeight}px)`;

  // Progress
  const progress = document.getElementById('progress');
  if (n >= 1 && n <= 4) {
    progress.textContent = `${n} / 4`;
    progress.classList.remove('hidden');
  } else {
    progress.classList.add('hidden');
  }

  // Answer piping on step 3
  if (n === 3) updateWhyLabel();

  // Auto-focus
  const step = document.querySelector(`.step[data-step="${n}"]`);
  if (step) {
    const focusable = step.querySelector('textarea, input[type="text"]');
    if (focusable) setTimeout(() => focusable.focus(), 300);
  }
}

// Recalculate on resize
function recalcSteps() {
  const stepHeight = document.querySelector('.step')?.offsetHeight;
  if (!stepHeight) return;
  document.querySelectorAll('.step').forEach(s => {
    s.style.height = `${stepHeight}px`;
  });
  const track = document.getElementById('wizard-track');
  track.style.transform = `translateY(-${state.currentStep * stepHeight}px)`;
}

// --- Arrow key / Enter navigation ---
function canNavigateWithKeys() {
  const active = document.activeElement;
  // Don't navigate if typing in a textarea or contenteditable
  if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)) return false;
  return true;
}

function getNextStep(current) {
  if (current === 0) return 1;
  if (current >= 1 && current <= 3) {
    if (validateStep(current)) return current + 1;
    return current;
  }
  return current;
}

function getPrevStep(current) {
  if (current === 1) return 0;
  if (current > 1 && current <= 5) return current - 1;
  return current;
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

// --- Research phase UI (queued with delays for polish) ---
let eventQueue = [];
let processingQueue = false;

function resetResearchPhase() {
  const researchPhase = document.getElementById('research-phase');
  if (!researchPhase) return;
  researchPhase.classList.add('hidden');
  researchPhase.classList.remove('fade-out');
  const steps = researchPhase.querySelector('.research-steps');
  if (steps) steps.innerHTML = '';
  eventQueue = [];
  processingQueue = false;
}

function showResearchPhase() {
  const researchPhase = document.getElementById('research-phase');
  if (researchPhase) researchPhase.classList.remove('hidden');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function addSearchStart(person) {
  showResearchPhase();
  const steps = document.querySelector('#research-phase .research-steps');
  if (!steps) return;

  const div = document.createElement('div');
  div.className = 'research-step searching';
  div.dataset.person = person;
  div.innerHTML = `
    <div class="research-dot"></div>
    <div class="research-content">
      <div class="research-label">Searching for ${person}</div>
    </div>
  `;
  steps.appendChild(div);
}

function addSearchResult(person, summary) {
  const step = document.querySelector(`.research-step[data-person="${person}"]`);
  if (!step) return;
  step.classList.remove('searching');
  step.classList.add('found');
  // Truncate summary for display
  const short = summary.length > 120 ? summary.slice(0, 120) + '...' : summary;
  step.innerHTML = `
    <div class="research-dot"></div>
    <div class="research-content">
      <div class="research-label">Found context for ${person}</div>
      <div class="research-detail">${short}</div>
    </div>
  `;
}

function addWritingStep() {
  const steps = document.querySelector('#research-phase .research-steps');
  if (!steps) return;

  const div = document.createElement('div');
  div.className = 'research-step writing';
  div.innerHTML = `
    <div class="research-dot"></div>
    <div class="research-content">
      <div class="research-label">Crafting your introduction</div>
    </div>
  `;
  steps.appendChild(div);
}

function fadeOutResearchPhase() {
  const researchPhase = document.getElementById('research-phase');
  if (!researchPhase) return;
  researchPhase.classList.add('fade-out');
  setTimeout(() => {
    researchPhase.classList.add('hidden');
  }, 600);
}

// Process queued events with delays for a polished feel
async function processEventQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (eventQueue.length > 0) {
    const event = eventQueue.shift();

    switch (event.type) {
      case 'search_start':
        addSearchStart(event.person);
        await delay(800);
        break;

      case 'search_result':
        addSearchResult(event.person, event.summary);
        await delay(1000);
        break;

      case 'writing':
        addWritingStep();
        await delay(600);
        break;

      case 'text':
        if (!firstTextReceived) {
          firstTextReceived = true;
          await delay(400);
          fadeOutResearchPhase();
          await delay(600);
          document.getElementById('subject-row').classList.remove('hidden');
          document.getElementById('intro-body').classList.remove('hidden');
          document.getElementById('output-actions').classList.remove('hidden');
          document.getElementById('intro-body').classList.add('streaming');
        }
        // Typewriter effect: render text in small groups with micro-delays
        {
          const body = document.getElementById('intro-body');
          const chars = event.content;
          const chunkSize = 2;
          for (let i = 0; i < chars.length; i += chunkSize) {
            body.textContent += chars.slice(i, i + chunkSize);
            body.scrollTop = body.scrollHeight;
            if (chars.length > chunkSize) await delay(18);
          }
        }
        break;

      case 'subject':
        document.getElementById('subject-text').textContent = event.content;
        break;

      case 'done':
        // Flush any remaining text display
        await delay(100);
        document.getElementById('intro-body').classList.remove('streaming');
        document.getElementById('intro-body').contentEditable = 'true';
        document.getElementById('generate-btn').disabled = false;
        // Show Claude Code promo
        document.getElementById('skill-promo')?.classList.remove('hidden');
        lastResult = {
          subject: document.getElementById('subject-text').textContent,
          body: document.getElementById('intro-body').textContent
        };
        break;

      case 'error':
        showError(event.message);
        break;
    }
  }

  processingQueue = false;
}

// --- Event handler for SSE events (queues for delayed display) ---
function handleEvent(event) {
  eventQueue.push(event);
  processEventQueue();
}

// --- SSE processor ---
async function processSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
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
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        handleEvent(event);
      } catch {
        // Skip malformed lines
        continue;
      }
    }
  }
}

// --- Generate ---
async function generate() {
  syncStateFromDOM();
  goToStep(5);

  // Reset output
  document.getElementById('subject-text').textContent = '';
  const introBody = document.getElementById('intro-body');
  introBody.textContent = '';
  introBody.contentEditable = 'false';
  introBody.classList.remove('streaming');
  hideError();

  // Reset research phase
  resetResearchPhase();
  firstTextReceived = false;

  // Hide output elements until first text arrives
  document.getElementById('subject-row').classList.add('hidden');
  introBody.classList.add('hidden');
  document.getElementById('output-actions').classList.add('hidden');
  document.getElementById('skill-promo')?.classList.add('hidden');

  const generateBtn = document.getElementById('generate-btn');
  generateBtn.disabled = true;

  try {
    const body = {
      personA: state.personA,
      personB: state.personB,
      why: state.why,
      tone: state.tone,
      language: state.language,
      yourName: state.yourName,
      personal: state.personal
    };

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 429) {
        throw new Error('Daily limit reached (5 intros per day). Come back tomorrow!');
      }
      throw new Error(err.error || `Server error: ${res.status}`);
    }

    await processSSE(res.body);
  } catch (err) {
    showError(err.message);
    // Re-enable on error
    introBody.classList.remove('streaming');
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
  state.emailA = document.getElementById('email-a').value;
  state.emailB = document.getElementById('email-b').value;
  saveState();
}

function restoreDOM() {
  document.getElementById('person-a').value = state.personA;
  document.getElementById('person-b').value = state.personB;
  document.getElementById('why').value = state.why;
  document.getElementById('personal').value = state.personal;
  document.getElementById('your-name').value = state.yourName;
  document.getElementById('email-a').value = state.emailA;
  document.getElementById('email-b').value = state.emailB;

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
  ['person-a', 'person-b', 'why', 'personal', 'your-name', 'email-a', 'email-b'].forEach(id => {
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
    const emails = [state.emailA, state.emailB].filter(e => e.trim());
    const to = emails.join(',');
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  document.getElementById('regen-btn').addEventListener('click', () => generate());

  document.getElementById('start-over-btn').addEventListener('click', () => {
    const keep = { yourName: state.yourName };
    state = { ...defaultState, ...keep };
    saveState();
    restoreDOM();
    goToStep(0);
  });

  // Hero start button
  document.getElementById('hero-start').addEventListener('click', () => goToStep(1));

  // Arrow key navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      if (!canNavigateWithKeys()) return;
      e.preventDefault();
      syncStateFromDOM();
      goToStep(getNextStep(state.currentStep));
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      if (!canNavigateWithKeys()) return;
      e.preventDefault();
      goToStep(getPrevStep(state.currentStep));
    }
    // Enter on hero screen
    if (e.key === 'Enter' && state.currentStep === 0) {
      e.preventDefault();
      goToStep(1);
    }
  });

  // Resize handler
  window.addEventListener('resize', () => recalcSteps());
}

// --- Init ---
function init() {
  restoreDOM();
  wireEvents();
  // Always start at hero screen on load (data is preserved in localStorage)
  goToStep(0);
}

document.addEventListener('DOMContentLoaded', init);
