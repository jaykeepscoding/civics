import data from '../data/questions.json';
import { bucketOf } from './store.js';

export const QUESTIONS = data.questions;
export const BY_ID = new Map(QUESTIONS.map(q => [q.id, q]));

/**
 * How many copies of a card go into the deck, by bucket. Weighting by
 * duplication rather than probability keeps the deck inspectable — you can
 * log it and see exactly what you're about to be asked.
 */
const WEIGHT = { missed: 3, unseen: 2, known: 1 };

/** Section / subsection filters, derived from the data rather than hardcoded. */
export function filters() {
  const out = [{ key: 'all', name: 'All questions', n: QUESTIONS.length, sub: false }];
  const seen = new Set();

  for (const q of QUESTIONS) {
    const sKey = 'S:' + q.section;
    if (!seen.has(sKey)) {
      seen.add(sKey);
      out.push({
        key: sKey,
        name: q.section,
        n: QUESTIONS.filter(x => x.section === q.section).length,
        sub: false
      });
      const subs = [...new Set(
        QUESTIONS.filter(x => x.section === q.section).map(x => x.subsection)
      )];
      for (const sub of subs) {
        out.push({
          key: 'B:' + sub,
          name: shorten(sub),
          n: QUESTIONS.filter(x => x.subsection === sub).length,
          sub: true
        });
      }
    }
  }
  return out;
}

function shorten(name) {
  return name
    .replace('Principles of American Government', 'Principles')
    .replace('Rights and Responsibilities', 'Rights & Responsibilities')
    .replace('Colonial Period and Independence', 'Colonial & Independence')
    .replace('Recent American History and Other Important Historical Information', 'Recent History');
}

export function idsFor(filterKey) {
  if (filterKey === 'all') return QUESTIONS.map(q => q.id);
  if (filterKey.startsWith('S:')) {
    const s = filterKey.slice(2);
    return QUESTIONS.filter(q => q.section === s).map(q => q.id);
  }
  const b = filterKey.slice(2);
  return QUESTIONS.filter(q => q.subsection === b).map(q => q.id);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a study deck: filter by section, narrow by study mode, then weight
 * by bucket and shuffle. Returns an array of question ids, with missed cards
 * appearing multiple times.
 */
export function build({ filter = 'all', mode = 'all' } = {}) {
  let ids = idsFor(filter);

  if (mode === 'missed') ids = ids.filter(id => bucketOf(id) === 'missed');
  if (mode === 'unseen') ids = ids.filter(id => bucketOf(id) === 'unseen');

  if (mode !== 'all') return shuffle(ids.slice());

  const deck = [];
  for (const id of ids) {
    const copies = WEIGHT[bucketOf(id)] ?? 1;
    for (let i = 0; i < copies; i++) deck.push(id);
  }
  return shuffle(deck);
}
