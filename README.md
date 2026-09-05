# 🏈 Gridiron — a football roguelike

A Balatro-style roguelike where every round is a game of football. Win to
advance, then spend your cash in the locker room. Runs in the browser, built
for playing (and sharing) on an iPhone.

**No build step, no dependencies** — plain HTML/CSS/JS. Just open `index.html`.

## How to play

- Each **game** gives you **6 drives** to beat the opponent's **target score**.
- A round has **3 games** of rising difficulty: **Scrimmage → Home → Away**.
  Win all 3 to advance to the next (harder) round. Lose one and the run ends.
- Every down, the **defense shows its call**. Counter it:
  - **Run Stuff** (blitz) → **pass** on them.
  - **Pass Coverage** → **run** on them.
  - **Balanced** → anything works.
  - **Play-Action** punishes the blitz hardest of all.
- You call plays from a **hand drawn from your deck**, so a balanced playbook
  means you'll have an answer for whatever the defense shows.
- Player ratings (QB, RB, WRs, O-Line, Kicker) scale your yardage; the Kicker
  decides field goals. **Injuries** can strike during a game and last until the
  end of the round.

## The locker room (between games)

Spend cash earned from wins:
- **Upgrade players** — raise a position's rating.
- **Fandom** — higher tier = more cash per future win (your interest engine).
- **Playbook** — buy new plays into your deck.
- **Coaches** — passive perks (bigger hand, fewer injuries, better FGs, etc.).
- **Reroll** the shop's offerings.

Your in-progress run auto-saves in the browser, so you can close the tab and
pick it back up.

## Run it locally

Because it uses ES modules, open it through a tiny web server (not `file://`):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Play on your phone / share with friends (GitHub Pages)

1. Push this repo to GitHub.
2. Repo **Settings → Pages** → *Build and deployment* → **Deploy from a branch**.
3. Pick the branch and the **`/ (root)`** folder, then **Save**.
4. GitHub gives you a URL (e.g. `https://<you>.github.io/rogue-football/`).
   Open it on an iPhone and send the link to friends.

## Project layout

```
index.html      # shell + mobile viewport, loads the app
styles.css      # mobile-first styling
src/
  main.js       # controller: screen flow + actions
  state.js      # run state + localStorage save/load
  data.js       # ALL plays, matchups, coaches, tuning constants — tweak balance here
  engine.js     # drive & game resolution (matchups + ratings + luck)
  ui.js         # rendering for each screen
  rng.js        # random helpers
```

**Tuning knobs live in `src/data.js`** (`CONFIG`, `targetScore`, the `MATCHUP`
matrix, plays, coaches). Change balance without touching game logic.

## Ideas for later

Boss-game modifiers, richer animation, more plays/coaches, opponent AI, sound.
Kept out of the first version on purpose — this is the simple, playable core.
