# Civics 128

Flashcards for the 2025 USCIS naturalization civics test (128 questions).
Vanilla JS + Vite, no framework. Progress lives in `localStorage`; there is no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve the built output
```

## Deploy (Netlify)

Connect the repo. `netlify.toml` already sets:

- build command `npm run build`
- publish directory `dist`

Nothing else to configure. Add the URL to your iPhone home screen so it runs
as a standalone PWA and is exempt from Safari's 7-day storage eviction.

## Layout

```
index.html              markup shell
src/js/main.js          bootstrap + keyboard
src/js/deck.js          filtering, bucket weighting, shuffle
src/js/card.js          card markup + swipe gestures
src/js/menu.js          menu sheet
src/js/store.js         localStorage persistence
src/styles/base.css     tokens, burger
src/styles/card.css     card + drop animation
src/styles/menu.css     menu sheet
src/data/questions.json the 128 questions
```

## Controls

| Action | Gesture | Key |
|---|---|---|
| Reveal answer | tap card | Space |
| Knew it | swipe right | → |
| Missed it | swipe left | ← |
| Skip, no grade | — | ↓ |

## Data

`src/data/questions.json` is imported at build time, so editing it requires a
rebuild (automatic on push).

Each question:

```jsonc
{
  "id": 60,
  "section": "American Government",
  "subsection": "System of Government",
  "prompt": "What is the purpose of the 10th Amendment?",
  "answers": ["..."],
  "answerMode": "any_one",   // or "n_of"
  "requiredCount": 1,
  "starred": false,          // one of the 20 for 65/20 applicants
  "volatile": false,         // answer changes with elections/appointments
  "stateDependent": false,   // answer depends on where you live
  "note": null
}
```

**Cards with `answers: []`** render the `note` instead of an answer. Eight
questions ship this way — 30, 38, 39, 57 (volatile) and 23, 29, 61, 62
(state-dependent). Fill in `answers` for each and they behave like any other card.

**Long answer lists** collapse to the first 3 (or `requiredCount` for `n_of`)
with a "+N more accepted" label. Trimming `answers` down to the single shortest
correct answer removes that label and tightens the card.

## Progress

Stored under the `civics128` key, keyed by question **id** — so editing or
regenerating `questions.json` does not wipe progress. Bump `VERSION` in
`store.js` and add a case to `migrate()` if the shape ever changes.

Deck weighting is by duplication, not probability: missed cards enter the deck
3×, unseen 2×, known 1×. Log the array from `build()` to see exactly what's coming.
