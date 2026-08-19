import { BY_ID } from './deck.js';
import { card as cardState } from './store.js';

const VISIBLE = 6;          // rendered cards, not deck length
const STAGGER = 175;         // ms between drops
const COMMIT = 0.30;        // fraction of card width to trigger a swipe
const TAP_SLOP = 10;        // px of movement still counted as a tap

/** Answers shown before collapsing into "+N more". */
function visibleAnswers(q) {
  if (!q.answers.length) return { shown: [], hidden: 0, note: q.note };
  const cap = q.answerMode === 'n_of' ? q.requiredCount : 3;
  return {
    shown: q.answers.slice(0, cap),
    hidden: Math.max(0, q.answers.length - cap),
    note: null
  };
}

function markup(q) {
  const { shown, hidden, note } = visibleAnswers(q);
  const st = cardState(q.id);

  const body = note
    ? `<li class="note">${note}</li>`
    : shown.map(a => `<li>${a}</li>`).join('');

  const count = q.answerMode === 'n_of'
    ? `<p class="count">Name ${q.requiredCount}</p>` : '';

  const more = hidden > 0
    ? `<p class="more">+${hidden} more accepted</p>` : '';

  const tally = st.miss > 0
    ? `<span class="tally">Missed ${st.miss}\u00d7</span>` : '';

  return `
    <span class="meta">${q.id}</span>
    <p class="prompt">${q.prompt}</p>
    ${count}
    <ul class="answers">${body}${more ? '' : ''}</ul>
    ${more}
    ${tally}
    <span class="dot"></span>`;
}

/**
 * Render the top VISIBLE cards of the deck.
 * onGrade(id, knewIt) fires when a card is swiped away.
 */
export function renderDeck(deckEl, ids, cursor, { animate, onGrade }) {
  deckEl.innerHTML = '';
  const n = Math.min(VISIBLE, ids.length);

  for (let k = n - 1; k >= 0; k--) {
    const q = BY_ID.get(ids[(cursor + k) % ids.length]);
    if (!q) continue;

    const el = document.createElement('article');
    el.className = 'card';
    const ry = k * 7;
    const rs = 1 - k * 0.022;
    el.style.transform = `translateY(${ry}px) scale(${rs})`;
    el.style.zIndex = String(10 - k);
    if (k > 0) el.style.pointerEvents = 'none';

    if (animate) {
      el.style.setProperty('--ry', ry + 'px');
      el.style.setProperty('--rs', String(rs));
      el.style.setProperty('--tilt', `${(k % 2 ? -1 : 1) * (3 + k * 1.5)}deg`);
      el.style.setProperty('--delay', `${(n - 1 - k) * STAGGER}ms`);
      el.classList.add('drop');
      el.addEventListener('animationend', () => el.classList.remove('drop'), { once: true });
    }

    el.innerHTML = markup(q);
    deckEl.appendChild(el);
    if (k === 0) attach(el, q.id, onGrade);
  }
}

function attach(el, id, onGrade) {
  let x0 = 0, y0 = 0, dx = 0, dragging = false, moved = false;

  el.addEventListener('pointerdown', e => {
    dragging = true; moved = false;
    x0 = e.clientX; y0 = e.clientY; dx = 0;
    el.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
    el.style.cursor = 'grabbing';
  });

  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) moved = true;
    el.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${dx * 0.045}deg)`;
    el.style.opacity = String(1 - Math.min(Math.abs(dx) / 500, 0.55));
  });

  el.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    el.style.transition = 'transform .28s cubic-bezier(.2,.7,.3,1), opacity .28s ease';

    if (!moved) {                       // tap anywhere = reveal
      el.classList.toggle('revealed');
      el.style.transform = '';
      el.style.opacity = '';
      return;
    }

    if (Math.abs(dx) > el.offsetWidth * COMMIT) {
      const dir = Math.sign(dx);
      el.style.transform = `translate(${dir * 600}px, 60px) rotate(${dir * 22}deg)`;
      el.style.opacity = '0';
      const knewIt = dir > 0;           // right = knew it, left = missed
      setTimeout(() => onGrade(id, knewIt), 190);
    } else {
      el.style.transform = '';
      el.style.opacity = '';
    }
  });

  el.addEventListener('pointercancel', () => {
    dragging = false;
    el.style.transition = 'transform .28s ease';
    el.style.transform = '';
    el.style.opacity = '';
  });
}
