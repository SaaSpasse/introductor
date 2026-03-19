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
  const { emailA, emailB, ...persistable } = state;
  localStorage.setItem(STATE_KEY, JSON.stringify(persistable));
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
function measureAndLayout() {
  const viewport = document.querySelector('.wizard-viewport');
  if (!viewport) return 0;
  const h = viewport.offsetHeight;
  document.querySelectorAll('.step').forEach(step => {
    step.style.height = h + 'px';
    step.style.minHeight = h + 'px';
  });
  return h;
}

function goToStep(n) {
  if (n < 0 || n > 5) return;
  state.currentStep = n;
  saveState();

  const h = measureAndLayout();
  const track = document.getElementById('wizard-track');
  track.style.transform = `translateY(-${n * h}px)`;

  const progress = document.getElementById('progress');
  if (n >= 1 && n <= 4) {
    progress.textContent = `${n} / 4`;
    progress.style.visibility = 'visible';
  } else {
    progress.style.visibility = 'hidden';
  }

  if (n === 3) updateWhyLabel();

  const step = document.querySelector(`.step[data-step="${n}"]`);
  if (step) {
    const focusable = step.querySelector('textarea, input[type="text"]');
    if (focusable) setTimeout(() => focusable.focus(), 400);
  }
}

function recalcSteps() {
  const h = measureAndLayout();
  const track = document.getElementById('wizard-track');
  if (track) {
    track.style.transition = 'none';
    track.style.transform = `translateY(-${state.currentStep * h}px)`;
    requestAnimationFrame(() => { track.style.transition = ''; });
  }
}

// --- Arrow key / Enter navigation ---
function canNavigateWithKeys() {
  const active = document.activeElement;
  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.isContentEditable)) return false;
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
  setTimeout(() => el.classList.remove('shake'), 400);
}

// --- Research phase UI ---
let eventQueue = [];
let processingQueue = false;

function resetResearchPhase() {
  const researchPhase = document.getElementById('research-phase');
  if (!researchPhase) return;
  researchPhase.classList.add('hidden');
  researchPhase.classList.remove('fade-out');
  const steps = researchPhase.querySelector('.research-steps');
  if (steps) steps.textContent = '';
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

function escapeText(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.textContent;
}

function createResearchStep(className, personAttr, labelText, detailText) {
  const div = document.createElement('div');
  div.className = 'research-step ' + className;
  if (personAttr) div.dataset.person = personAttr;

  const dot = document.createElement('div');
  dot.className = 'research-dot';
  div.appendChild(dot);

  const content = document.createElement('div');
  content.className = 'research-content';

  const label = document.createElement('div');
  label.className = 'research-label';
  label.textContent = labelText;
  content.appendChild(label);

  if (detailText) {
    const detail = document.createElement('div');
    detail.className = 'research-detail';
    detail.textContent = detailText;
    content.appendChild(detail);
  }

  div.appendChild(content);
  return div;
}

function addSearchStart(person) {
  showResearchPhase();
  const steps = document.querySelector('#research-phase .research-steps');
  if (!steps) return;
  steps.appendChild(createResearchStep('searching', person, 'Searching for ' + escapeText(person)));
}

function addSearchResult(person, summary) {
  const step = document.querySelector(`.research-step[data-person="${CSS.escape(person)}"]`);
  if (!step) return;
  step.className = 'research-step found';

  // Clear and rebuild content safely
  while (step.firstChild) step.removeChild(step.firstChild);

  const dot = document.createElement('div');
  dot.className = 'research-dot';
  step.appendChild(dot);

  const content = document.createElement('div');
  content.className = 'research-content';

  const label = document.createElement('div');
  label.className = 'research-label';
  label.textContent = 'Found context for ' + person;
  content.appendChild(label);

  const short = summary.length > 120 ? summary.slice(0, 120) + '...' : summary;
  const detail = document.createElement('div');
  detail.className = 'research-detail';
  detail.textContent = short;
  content.appendChild(detail);

  step.appendChild(content);
}

function addWritingStep() {
  const steps = document.querySelector('#research-phase .research-steps');
  if (!steps) return;
  steps.appendChild(createResearchStep('writing', null, 'Crafting your introduction'));
}

function fadeOutResearchPhase() {
  const researchPhase = document.getElementById('research-phase');
  if (!researchPhase) return;
  researchPhase.classList.add('fade-out');
  setTimeout(() => { researchPhase.classList.add('hidden'); }, 500);
}

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
          await delay(500);
          document.getElementById('subject-row').classList.remove('hidden');
          document.getElementById('intro-body').classList.remove('hidden');
          document.getElementById('output-actions').classList.remove('hidden');
          document.getElementById('intro-body').classList.add('streaming');
        }
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
        await delay(100);
        document.getElementById('intro-body').classList.remove('streaming');
        document.getElementById('intro-body').contentEditable = 'true';
        document.getElementById('intro-body').scrollTop = 0;
        document.querySelector('.step[data-step="5"]').scrollTop = 0;
        document.getElementById('generate-btn').disabled = false;
        document.getElementById('generate-btn').textContent = 'Generate introduction';
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
        continue;
      }
    }
  }
}

// --- Generate ---
async function generate() {
  syncStateFromDOM();

  if (!state.yourName.trim()) {
    shakeField('your-name');
    return;
  }

  goToStep(5);

  document.getElementById('subject-text').textContent = '';
  const introBody = document.getElementById('intro-body');
  introBody.textContent = '';
  introBody.contentEditable = 'false';
  introBody.classList.remove('streaming');
  hideError();

  resetResearchPhase();
  firstTextReceived = false;

  document.getElementById('subject-row').classList.add('hidden');
  introBody.classList.add('hidden');
  document.getElementById('output-actions').classList.add('hidden');
  document.getElementById('skill-promo')?.classList.add('hidden');

  const generateBtn = document.getElementById('generate-btn');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

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
      throw new Error(err.error || `Server error: ${res.status}`);
    }

    await processSSE(res.body);
  } catch (err) {
    showError(err.message);
    introBody.classList.remove('streaming');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate introduction';
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

  setActivePill('tone-pills', state.tone);
  setActivePill('lang-pills', state.language);

  if (state.personal) {
    document.getElementById('personal').classList.remove('hidden');
    document.getElementById('personal-toggle').textContent = '- Remove personal touch';
  }
}

function setActivePill(groupId, value) {
  document.getElementById(groupId).querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.value === value);
  });
}

// --- Voice input (Web Speech API) ---
let activeRecognition = null;
let activeTarget = null;

function getSpeechLang() {
  return state.language === 'fr' ? 'fr-CA' : 'en-US';
}

function hasSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function toggleVoice(btn) {
  const targetId = btn.dataset.target;
  const textarea = document.getElementById(targetId);

  if (activeRecognition && activeTarget === targetId) {
    activeRecognition.stop();
    return;
  }

  if (activeRecognition) activeRecognition.stop();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = getSpeechLang();
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = textarea.value;

  recognition.onstart = () => {
    btn.classList.add('listening');
    activeRecognition = recognition;
    activeTarget = targetId;
  };

  recognition.onresult = (e) => {
    let interim = '';
    let newFinal = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        newFinal += e.results[i][0].transcript;
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    if (newFinal) {
      const separator = finalTranscript.length > 0 && !finalTranscript.endsWith(' ') ? ' ' : '';
      finalTranscript += separator + newFinal;
    }
    textarea.value = finalTranscript + (interim ? ' ' + interim : '');
    const key = targetId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    state[key] = textarea.value;
    saveState();
  };

  recognition.onend = () => {
    btn.classList.remove('listening');
    textarea.value = finalTranscript;
    const key = targetId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    state[key] = textarea.value;
    saveState();
    if (activeTarget === targetId) {
      activeRecognition = null;
      activeTarget = null;
    }
  };

  recognition.onerror = () => {
    btn.classList.remove('listening');
    activeRecognition = null;
    activeTarget = null;
  };

  recognition.start();
}

// --- Event wiring ---
function wireEvents() {
  document.querySelectorAll('.btn-mic').forEach(btn => {
    if (!hasSpeechRecognition()) {
      btn.style.display = 'none';
      const wrap = btn.closest('.textarea-wrap');
      if (wrap) wrap.querySelector('textarea').style.paddingRight = '16px';
    } else {
      btn.addEventListener('click', () => toggleVoice(btn));
    }
  });

  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.closest('.step').dataset.step);
      if (validateStep(step)) goToStep(parseInt(btn.dataset.next));
    });
  });

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.back)));
  });

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

  document.getElementById('personal-toggle').addEventListener('click', () => {
    const ta = document.getElementById('personal');
    const isHidden = ta.classList.contains('hidden');
    ta.classList.toggle('hidden');
    document.getElementById('personal-toggle').textContent = isHidden ? '- Remove personal touch' : '+ Add personal touch';
    if (isHidden) ta.focus();
  });

  ['person-a', 'person-b', 'why', 'personal', 'your-name', 'email-a', 'email-b'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      state[key] = el.value;
      saveState();
    });
  });

  document.getElementById('generate-btn').addEventListener('click', () => generate());

  // --- Output actions ---
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

  document.getElementById('share-btn').addEventListener('click', async () => {
    const subject = document.getElementById('subject-text').textContent;
    const body = document.getElementById('intro-body').innerText;
    const btn = document.getElementById('share-btn');
    if (!subject || !body) return;

    btn.textContent = 'Sharing...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, fromName: state.yourName || 'Someone' })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to share');
      }

      const data = await res.json();
      try {
        await navigator.clipboard.writeText(data.url);
        btn.textContent = 'Link copied!';
      } catch {
        prompt('Share link:', data.url);
        btn.textContent = 'Link ready';
      }
      setTimeout(() => { btn.textContent = 'Share as link'; btn.disabled = false; }, 3000);
    } catch (_err) {
      btn.textContent = 'Share failed';
      setTimeout(() => { btn.textContent = 'Share as link'; btn.disabled = false; }, 2000);
    }
  });

  document.getElementById('email-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-text').textContent;
    const body = document.getElementById('intro-body').innerText;
    const emails = [state.emailA, state.emailB].filter(e => e && e.trim());
    const to = emails.join(',');

    const mailtoUrl = 'mailto:' + encodeURIComponent(to)
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);

    window.open(mailtoUrl, '_self');
  });

  document.getElementById('regen-btn').addEventListener('click', () => generate());

  document.getElementById('start-over-btn').addEventListener('click', () => {
    const keep = { yourName: state.yourName };
    state = { ...defaultState, ...keep };
    saveState();
    restoreDOM();
    goToStep(0);
  });

  document.getElementById('hero-start').addEventListener('click', () => goToStep(1));

  document.getElementById('hero-example').addEventListener('click', () => {
    state.personA = 'Sarah Chen, CTO at TalentAI, building AI-powered hiring tools. Raised $2M seed. Based in Montreal.';
    state.personB = 'Mike Park, VP Engineering at Acme Corp, hiring 20 engineers this quarter. Previously at Shopify.';
    state.why = "Sarah's AI hiring tool could help Mike fill his engineering roles faster. They're both in the Montreal tech scene and both spoke at ConFoo last year.";
    state.tone = 'warm';
    state.language = 'en';
    state.personal = '';
    saveState();
    restoreDOM();
    goToStep(4);
  });

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
    if (e.key === 'Enter' && state.currentStep === 0) {
      e.preventDefault();
      goToStep(1);
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recalcSteps, 100);
  });
}

// --- Init ---
function init() {
  restoreDOM();
  wireEvents();

  const isMac = navigator.platform.toUpperCase().includes('MAC');
  if (!isMac) {
    document.querySelectorAll('.kbd-hint').forEach(el => {
      el.textContent = 'Ctrl+Enter';
    });
  }

  goToStep(0);

  fetch('/api/stats')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('stats-count');
      if (data.total && data.total > 0) {
        el.textContent = data.total + ' introductions crafted. ';
      }
    })
    .catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
