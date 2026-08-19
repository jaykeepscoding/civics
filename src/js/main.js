import '../styles/base.css';
import '../styles/card.css';
import '../styles/menu.css';

import { build } from './deck.js';
import { renderDeck } from './card.js';
import { initMenu } from './menu.js';
import { grade, session } from './store.js';

const deckEl = document.getElementById('deck');
const emptyEl = document.getElementById('empty');

let ids = [];
let cursor = 0;

// The drop animation plays once per app open, not on every re-render.
// sessionStorage is the right granularity: it survives navigation, not relaunch.
let animateNext = !sessionStorage.getItem('dropped');

function rebuild({ animate = false } = {}) {
  ids = build(session());
  cursor = 0;
  draw({ animate });
}

function draw({ animate = false } = {}) {
  if (!ids.length) {
    deckEl.hidden = true;
    emptyEl.hidden = false;
    emptyEl.textContent = session().mode === 'missed'
      ? 'Nothing missed yet in this section. Switch back to All to start.'
      : 'No cards here. Try another section.';
    return;
  }

  deckEl.hidden = false;
  emptyEl.hidden = true;

  const shouldAnimate = animate || animateNext;
  if (animateNext) {
    animateNext = false;
    sessionStorage.setItem('dropped', '1');
  }

  renderDeck(deckEl, ids, cursor, { animate: shouldAnimate, onGrade });
}

function onGrade(id, knewIt) {
  grade(id, knewIt);
  cursor = (cursor + 1) % ids.length;
  menu.refresh();
  draw();
}

function advance() {
  if (!ids.length) return;
  cursor = (cursor + 1) % ids.length;
  draw();
}

const menu = initMenu({
  onChange: () => rebuild(),
  onShuffle: () => rebuild({ animate: true }),
  onReset: () => rebuild({ animate: true }),
  // Replay keeps ids and cursor, so the same cards fall again in the same order.
  onReplay: () => draw({ animate: true })
});

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  if (menu.isOpen()) return;
  const top = deckEl.querySelector('.card');

  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    top?.classList.toggle('revealed');
  }
  if (e.key === 'ArrowRight') { e.preventDefault(); onGrade(currentId(), true); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); onGrade(currentId(), false); }
  if (e.key === 'ArrowDown')  { e.preventDefault(); advance(); }
});

function currentId() {
  return ids[cursor % ids.length];
}

rebuild();
