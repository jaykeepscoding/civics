/**
 * Persistence. Everything lives in one localStorage key, written as a single
 * blob. Card state is keyed by question id (never array index) so questions.json
 * can be edited or regenerated without invalidating progress.
 */

const KEY = 'civics128';
const VERSION = 1;

const blank = () => ({
  v: VERSION,
  cards: {},                                  // id -> { b, miss, seen, last }
  settings: { scale: 130 },
  session: { filter: 'all', mode: 'all' }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    if (parsed.v !== VERSION) return migrate(parsed);
    return { ...blank(), ...parsed };
  } catch {
    // Corrupt or unavailable (private mode) — fall back to in-memory only.
    return blank();
  }
}

function migrate(old) {
  // No migrations yet. When the schema changes, translate here instead of
  // discarding, so nobody loses three weeks of progress to a version bump.
  return { ...blank(), cards: old.cards ?? {} };
}

let pending = null;
function save() {
  // Coalesce rapid writes (a fast swipe streak) into one.
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — session continues, just doesn't persist */
    }
  });
}

/** Card record, lazily created so new questions slot in as unseen. */
export function card(id) {
  return state.cards[id] ?? { b: 'unseen', miss: 0, seen: 0, last: 0 };
}

export function bucketOf(id) {
  return card(id).b;
}

export function grade(id, knewIt) {
  const c = { ...card(id) };
  c.seen += 1;
  c.last = Date.now();
  if (knewIt) {
    c.b = 'known';
  } else {
    c.b = 'missed';
    c.miss += 1;
  }
  state.cards[id] = c;
  save();
}

export function counts(ids) {
  const out = { known: 0, missed: 0, unseen: 0 };
  for (const id of ids) out[card(id).b] += 1;
  return out;
}

export function settings() {
  return state.settings;
}

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}

export function session() {
  return state.session;
}

export function setSession(patch) {
  Object.assign(state.session, patch);
  save();
}

export function resetProgress() {
  state.cards = {};
  save();
}
