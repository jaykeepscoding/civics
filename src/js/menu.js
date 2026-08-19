import { filters, idsFor } from './deck.js';
import { counts, settings, setSetting, session, setSession, resetProgress } from './store.js';

const $ = id => document.getElementById(id);

const SHEET_MS = 220;   // keep in step with the sheet transition in menu.css

export function initMenu({ onChange, onShuffle, onReset, onReplay }) {
  const sheet = $('sheet');
  const openBtn = $('openMenu');
  const closeBtn = $('closeMenu');

  /* ---- section list, derived from the data ---- */
  const list = $('sections');
  list.innerHTML = filters().map(f => `
    <li><button data-key="${f.key}" class="${f.sub ? 'sub' : ''}"
        aria-pressed="${f.key === session().filter}">
      <span>${f.name}</span><span class="n">${f.n}</span>
    </button></li>`).join('');

  list.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    list.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    setSession({ filter: b.dataset.key });
    refresh();
    onChange();
  });

  /* ---- study mode ---- */
  const modes = $('modes');
  modes.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === session().mode));
  });

  modes.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    modes.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    setSession({ mode: b.dataset.mode });
    onChange();
  });

  /* ---- text size ---- */
  const range = $('scale');
  const out = $('scaleOut');
  range.value = String(settings().scale);
  applyScale(settings().scale);
  out.textContent = settings().scale + '%';

  range.addEventListener('input', () => {
    const v = +range.value;
    applyScale(v);
    out.textContent = v + '%';
    setSetting('scale', v);
  });

  /* ---- actions ---- */
  $('shuffle').addEventListener('click', () => { onShuffle(); close(); });

  // Same cards, same order — just play the drop again. Wait for the sheet to
  // clear first, otherwise it covers the thing you asked to watch.
  $('replay').addEventListener('click', () => {
    close();
    setTimeout(onReplay, SHEET_MS + 20);
  });

  // Two-step confirm: destructive, and a mis-tap three weeks in would hurt.
  const resetBtn = $('reset');
  let armed = false;
  let armTimer = null;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'Tap again to erase';
      resetBtn.classList.add('armed');
      armTimer = setTimeout(disarm, 4000);
      return;
    }
    clearTimeout(armTimer);
    disarm();
    resetProgress();
    refresh();
    onReset();
  });

  function disarm() {
    armed = false;
    resetBtn.textContent = 'Reset progress';
    resetBtn.classList.remove('armed');
  }

  /* ---- open / close ---- */
  function open() {
    refresh();
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    closeBtn.focus();
  }

  function close() {
    sheet.classList.remove('open');
    setTimeout(() => { sheet.hidden = true; }, SHEET_MS);
    openBtn.focus();
    disarm();
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !sheet.hidden) close();
  });

  /* ---- stats + mode availability ---- */
  function refresh() {
    const ids = idsFor(session().filter);
    const c = counts(ids);
    $('sKnown').textContent = c.known;
    $('sMissed').textContent = c.missed;
    $('sUnseen').textContent = c.unseen;

    // Don't offer a mode that would produce an empty deck.
    modes.querySelector('[data-mode="missed"]').disabled = c.missed === 0;
    modes.querySelector('[data-mode="unseen"]').disabled = c.unseen === 0;
  }

  return { refresh, isOpen: () => !sheet.hidden };
}

function applyScale(pct) {
  document.documentElement.style.setProperty('--scale', String(pct / 100));
}
