// All game data + tuning constants live here so balance is a one-file tweak.

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------
export const CONFIG = {
  drivesPerGame: 6, // possessions you get to hit the target
  handSize: 4, // plays drawn to choose from each play call
  fieldLength: 100, // yards; drive starts at own 25 => 75 to endzone
  driveStartYard: 25,
  firstDownYards: 10,
  fgRangeYard: 62, // if ball crosses this yardline, FG is attempted on 4th down
  touchdownPoints: 7,
  fieldGoalPoints: 3,

  injuryChancePerGame: 0.25, // chance that ONE injury event occurs in a game
  injuryRatingHit: [8, 20], // rating points lost when injured (min,max)

  // Economy
  baseWinCash: 4, // cash for winning a game
  fandomIncomePerTier: 1, // extra cash per fandom tier on a win
  rerollCost: 2,

  // Fandom upgrade cost curve: cost = fandomBaseCost + tier*fandomCostStep
  fandomBaseCost: 5,
  fandomCostStep: 3,

  // Player upgrade: +ratingPerUpgrade for costToUpgrade(rating)
  ratingPerUpgrade: 4,
  maxRating: 99,
};

// Target score curve. Round r (1-based), game index g (0=Scrimmage,1=Home,2=Away).
export const GAME_NAMES = ['Scrimmage', 'Home', 'Away'];
export function targetScore(round, gameIndex) {
  const base = [10, 17, 24][gameIndex]; // Scrimmage / Home / Away
  const roundBump = (round - 1) * 7; // each round harder
  return base + roundBump;
}

// Cash reward growth: later games/rounds pay a little more.
export function gameReward(round, gameIndex, fandomTier) {
  const winBonus = CONFIG.baseWinCash + gameIndex; // Away pays most
  const fandom = fandomTier * CONFIG.fandomIncomePerTier;
  const roundBonus = Math.floor((round - 1) * 0.5);
  return winBonus + fandom + roundBonus;
}

// Player upgrade cost scales with current rating.
export function upgradeCost(rating) {
  return 3 + Math.floor((rating - 50) / 5); // cheap early, pricier as you approach elite
}

export function fandomUpgradeCost(tier) {
  return CONFIG.fandomBaseCost + tier * CONFIG.fandomCostStep;
}

// ---------------------------------------------------------------------------
// Positions / starting roster
// ---------------------------------------------------------------------------
// Each position drives certain play families. Ratings 50-99.
export const POSITIONS = [
  { id: 'QB1', label: 'QB1', rating: 62 },
  { id: 'RB1', label: 'RB1', rating: 60 },
  { id: 'WR1', label: 'WR1', rating: 60 },
  { id: 'WR2', label: 'WR2', rating: 55 },
  { id: 'OL', label: 'O-Line', rating: 58 },
  { id: 'K', label: 'Kicker', rating: 60 },
];

// ---------------------------------------------------------------------------
// Plays
// ---------------------------------------------------------------------------
// family: which matchup row applies.
// base: [min,max] raw yards before matchup/rating/luck.
// positions: which player ratings contribute (averaged).
// rarity used for shop weighting.
export const PLAY_FAMILIES = {
  INSIDE_RUN: 'Inside Run',
  OUTSIDE_RUN: 'Outside Run',
  SHORT_PASS: 'Short Pass',
  DEEP_PASS: 'Deep Pass',
  PLAY_ACTION: 'Play Action',
};

export const DEFENSES = {
  RUN_STUFF: 'Run Stuff',
  BALANCED: 'Balanced',
  PASS_COVER: 'Pass Coverage',
};

// Matchup multiplier: [offense family][defense] => yardage multiplier.
// >1 = good matchup, <1 = shut down.
export const MATCHUP = {
  [PLAY_FAMILIES.INSIDE_RUN]: {
    [DEFENSES.RUN_STUFF]: 0.5,
    [DEFENSES.BALANCED]: 1.0,
    [DEFENSES.PASS_COVER]: 1.6,
  },
  [PLAY_FAMILIES.OUTSIDE_RUN]: {
    [DEFENSES.RUN_STUFF]: 0.45,
    [DEFENSES.BALANCED]: 1.05,
    [DEFENSES.PASS_COVER]: 1.7,
  },
  [PLAY_FAMILIES.SHORT_PASS]: {
    [DEFENSES.RUN_STUFF]: 1.5,
    [DEFENSES.BALANCED]: 1.0,
    [DEFENSES.PASS_COVER]: 0.6,
  },
  [PLAY_FAMILIES.DEEP_PASS]: {
    [DEFENSES.RUN_STUFF]: 1.8,
    [DEFENSES.BALANCED]: 0.95,
    [DEFENSES.PASS_COVER]: 0.45,
  },
  [PLAY_FAMILIES.PLAY_ACTION]: {
    [DEFENSES.RUN_STUFF]: 1.9, // sells the run, punishes the blitz
    [DEFENSES.BALANCED]: 1.0,
    [DEFENSES.PASS_COVER]: 0.7,
  },
};

// The play library. `starter: true` = in the starting deck.
export const PLAYS = [
  { id: 'dive', name: 'HB Dive', family: PLAY_FAMILIES.INSIDE_RUN, base: [2, 6], positions: ['RB1', 'OL'], rarity: 'common', starter: true, desc: 'Steady inside run.' },
  { id: 'power', name: 'Power O', family: PLAY_FAMILIES.INSIDE_RUN, base: [1, 9], positions: ['RB1', 'OL'], rarity: 'common', desc: 'Physical inside run, higher ceiling.' },
  { id: 'sweep', name: 'Toss Sweep', family: PLAY_FAMILIES.OUTSIDE_RUN, base: [0, 11], positions: ['RB1', 'OL'], rarity: 'common', starter: true, desc: 'Bounce it outside — boom or bust.' },
  { id: 'stretch', name: 'Outside Zone', family: PLAY_FAMILIES.OUTSIDE_RUN, base: [1, 10], positions: ['RB1', 'OL'], rarity: 'uncommon', desc: 'Zone run to the edge.' },
  { id: 'slant', name: 'Slant', family: PLAY_FAMILIES.SHORT_PASS, base: [3, 9], positions: ['QB1', 'WR1'], rarity: 'common', starter: true, desc: 'Quick, reliable pass.' },
  { id: 'screen', name: 'WR Screen', family: PLAY_FAMILIES.SHORT_PASS, base: [1, 12], positions: ['QB1', 'WR2', 'OL'], rarity: 'common', desc: 'Beats the blitz cleanly.' },
  { id: 'curl', name: 'Curl', family: PLAY_FAMILIES.SHORT_PASS, base: [4, 10], positions: ['QB1', 'WR1'], rarity: 'uncommon', desc: 'Sit in the soft spot.' },
  { id: 'post', name: 'Post', family: PLAY_FAMILIES.DEEP_PASS, base: [0, 22], positions: ['QB1', 'WR1'], rarity: 'uncommon', starter: true, desc: 'Deep shot down the middle.' },
  { id: 'go', name: 'Go Route', family: PLAY_FAMILIES.DEEP_PASS, base: [0, 30], positions: ['QB1', 'WR1'], rarity: 'rare', desc: 'Take the top off. High variance.' },
  { id: 'pafake', name: 'PA Boot', family: PLAY_FAMILIES.PLAY_ACTION, base: [2, 18], positions: ['QB1', 'WR2'], rarity: 'uncommon', desc: 'Fake the run, hit the flat/deep.' },
  { id: 'padeep', name: 'PA Deep Shot', family: PLAY_FAMILIES.PLAY_ACTION, base: [0, 26], positions: ['QB1', 'WR1'], rarity: 'rare', desc: 'Play-action bomb.' },
];

export const STARTER_DECK_IDS = PLAYS.filter((p) => p.starter).flatMap((p) => [p.id, p.id]); // 2 copies each

export function playById(id) {
  return PLAYS.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Coaches (passive perks). Tiered — pay more, get more.
// effect handled in engine/state.
// ---------------------------------------------------------------------------
export const COACHES = [
  { id: 'rb_coach', name: 'Run Game Coordinator', tier: 1, cost: 6, desc: '+15% yards on all run plays.', effect: { runMult: 1.15 } },
  { id: 'oc', name: 'Offensive Coordinator', tier: 2, cost: 9, desc: '+12% yards on all pass plays.', effect: { passMult: 1.12 } },
  { id: 'trainer', name: 'Head Trainer', tier: 1, cost: 6, desc: 'Halves injury chance.', effect: { injuryMult: 0.5 } },
  { id: 'filmroom', name: 'Film Room Analyst', tier: 2, cost: 8, desc: '+1 play in hand each down (more answers).', effect: { handBonus: 1 } },
  { id: 'st_coach', name: 'Special Teams Coach', tier: 1, cost: 5, desc: '+10 effective FG range & accuracy.', effect: { fgBonus: 10 } },
  { id: 'motivator', name: 'Motivator', tier: 2, cost: 10, desc: '+2 cash on every game win.', effect: { winCash: 2 } },
];

export function coachById(id) {
  return COACHES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Team name generator
// ---------------------------------------------------------------------------
const CITIES = ['River', 'Iron', 'North', 'Coastal', 'Granite', 'Sunset', 'Motor', 'Harbor', 'Steel', 'Prairie', 'Cedar', 'Summit', 'Bayou', 'Frost', 'Copper'];
const MASCOTS = ['Wolves', 'Aviators', 'Buffaloes', 'Sharks', 'Miners', 'Comets', 'Rhinos', 'Outlaws', 'Pythons', 'Blizzard', 'Raptors', 'Gators', 'Titans', 'Foxes', 'Hammers'];

export function randomTeamName() {
  const c = CITIES[Math.floor(Math.random() * CITIES.length)];
  const m = MASCOTS[Math.floor(Math.random() * MASCOTS.length)];
  return `${c} ${m}`;
}
