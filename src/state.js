// Run state + persistence. The "run" is the roguelike progress; a "game" is
// built transiently by the engine and not persisted mid-play.

import { POSITIONS, STARTER_DECK_IDS, coachById, CONFIG, randomTeamName } from './data.js';

const SAVE_KEY = 'rf_save_v1';

export function newRun() {
  return {
    teamName: randomTeamName(),
    round: 1,
    gameIndex: 0, // 0=Scrimmage, 1=Home, 2=Away
    cash: 0,
    fandomTier: 0,
    deck: STARTER_DECK_IDS.slice(),
    playLevels: {}, // { playId: level } — leveled plays gain base yards
    roster: POSITIONS.map((p) => ({ id: p.id, label: p.label, rating: p.rating })),
    injuries: [], // [{ posId, hit }] — cleared between rounds
    coaches: [], // coach ids owned
    dead: false,
    reachedRound: 1,
  };
}

export function playLevel(run, id) {
  return (run.playLevels && run.playLevels[id]) || 0;
}

// Unique play ids in the deck (for the "Level Up" shop section).
export function uniquePlayIds(run) {
  return [...new Set(run.deck)];
}

// -------- persistence --------
export function save(run) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(run));
  } catch (e) {
    /* storage may be unavailable (private mode) — ignore */
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const run = JSON.parse(raw);
    if (run && !run.dead) return run;
    return null;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    /* ignore */
  }
}

// -------- roster / ratings --------
export function rosterPos(run, posId) {
  return run.roster.find((p) => p.id === posId);
}

// Rating after injuries applied (for the current round).
export function effectiveRating(run, posId) {
  const base = rosterPos(run, posId)?.rating ?? 50;
  const hit = run.injuries
    .filter((i) => i.posId === posId)
    .reduce((s, i) => s + i.hit, 0);
  return Math.max(25, base - hit);
}

export function isInjured(run, posId) {
  return run.injuries.some((i) => i.posId === posId);
}

// -------- coaches / aggregated effects --------
export function coachEffects(run) {
  const eff = {
    runMult: 1, passMult: 1, injuryMult: 1, handBonus: 0, fgBonus: 0, winCash: 0,
    healPerGame: 0, upgradeDiscount: 0, fandomIncomeBonus: 0, freeReroll: false,
  };
  for (const id of run.coaches) {
    const c = coachById(id);
    if (!c) continue;
    if (c.effect.runMult) eff.runMult *= c.effect.runMult;
    if (c.effect.passMult) eff.passMult *= c.effect.passMult;
    if (c.effect.injuryMult) eff.injuryMult *= c.effect.injuryMult;
    if (c.effect.handBonus) eff.handBonus += c.effect.handBonus;
    if (c.effect.fgBonus) eff.fgBonus += c.effect.fgBonus;
    if (c.effect.winCash) eff.winCash += c.effect.winCash;
    if (c.effect.healPerGame) eff.healPerGame += c.effect.healPerGame;
    if (c.effect.upgradeDiscount) eff.upgradeDiscount += c.effect.upgradeDiscount;
    if (c.effect.fandomIncomeBonus) eff.fandomIncomeBonus += c.effect.fandomIncomeBonus;
    if (c.effect.freeReroll) eff.freeReroll = true;
  }
  return eff;
}

// Strength Coach: reduce active injuries by `amount` rating; drop healed ones.
export function healInjuries(run, amount) {
  if (!amount) return;
  run.injuries = run.injuries
    .map((i) => ({ ...i, hit: i.hit - amount }))
    .filter((i) => i.hit > 0);
}

export function hasCoach(run, id) {
  return run.coaches.includes(id);
}

// -------- progression --------
// Advance to the next game/round after a WIN. Returns { advancedRound }.
export function advanceAfterWin(run) {
  let advancedRound = false;
  run.gameIndex += 1;
  if (run.gameIndex > 2) {
    run.gameIndex = 0;
    run.round += 1;
    run.reachedRound = run.round;
    run.injuries = []; // players heal between rounds
    advancedRound = true;
  }
  return { advancedRound };
}
