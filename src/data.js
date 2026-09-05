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

  // Play leveling: each level adds this fraction to a play's base yards.
  playLevelYardBonus: 0.15,
  maxPlayLevel: 5,
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

// Leveling a play up costs more at higher levels.
export function levelUpCost(level) {
  return 4 + level * 3;
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
  { id: 'counter', name: 'Counter', family: PLAY_FAMILIES.INSIDE_RUN, base: [2, 10], positions: ['RB1', 'OL'], rarity: 'uncommon', desc: 'Misdirection inside run.' },
  { id: 'sneak', name: 'QB Sneak', family: PLAY_FAMILIES.INSIDE_RUN, base: [2, 4], positions: ['QB1', 'OL'], rarity: 'common', desc: 'Automatic short yardage. Very reliable.' },
  { id: 'jet', name: 'Jet Sweep', family: PLAY_FAMILIES.OUTSIDE_RUN, base: [0, 14], positions: ['WR2', 'OL'], rarity: 'uncommon', desc: 'Speed to the edge — high ceiling.' },
  { id: 'flat', name: 'Checkdown', family: PLAY_FAMILIES.SHORT_PASS, base: [3, 7], positions: ['QB1', 'RB1'], rarity: 'common', desc: 'Safe dump-off. Low variance.' },
  { id: 'out', name: 'Out Route', family: PLAY_FAMILIES.SHORT_PASS, base: [4, 11], positions: ['QB1', 'WR2'], rarity: 'common', desc: 'Snap to the sideline.' },
  { id: 'dig', name: 'Dig', family: PLAY_FAMILIES.SHORT_PASS, base: [5, 13], positions: ['QB1', 'WR1'], rarity: 'uncommon', desc: 'Intermediate crosser.' },
  { id: 'fade', name: 'Fade', family: PLAY_FAMILIES.DEEP_PASS, base: [0, 24], positions: ['QB1', 'WR1'], rarity: 'uncommon', desc: 'Back-shoulder shot. Great near the goal line.' },
  { id: 'rpo', name: 'RPO', family: PLAY_FAMILIES.PLAY_ACTION, base: [3, 14], positions: ['QB1', 'RB1', 'WR2'], rarity: 'uncommon', desc: 'Run-pass option — reads the box.' },
  { id: 'flea', name: 'Flea Flicker', family: PLAY_FAMILIES.PLAY_ACTION, base: [0, 34], positions: ['QB1', 'RB1', 'WR1'], rarity: 'rare', desc: 'Trick play. Boom or bust bomb.' },
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
  { id: 'strength', name: 'Strength Coach', tier: 2, cost: 9, desc: 'Injured players recover 8 rating before each game.', effect: { healPerGame: 8 } },
  { id: 'qbguru', name: 'QB Guru', tier: 1, cost: 6, desc: '+10% yards on pass plays.', effect: { passMult: 1.1 } },
  { id: 'gm', name: 'General Manager', tier: 1, cost: 7, desc: 'Player upgrades cost $2 less.', effect: { upgradeDiscount: 2 } },
  { id: 'hype', name: 'Hype Man', tier: 2, cost: 9, desc: '+$1 per fandom tier on every win.', effect: { fandomIncomeBonus: 1 } },
  { id: 'gambler', name: 'The Gambler', tier: 1, cost: 6, desc: 'Rerolling the shop is free.', effect: { freeReroll: true } },
];

export function coachById(id) {
  return COACHES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Boss-game modifiers — applied to the Away game for run variety.
// familyMult: per-family yard multipliers. disableFamilies: families that fail.
// targetMult / cashMult / injuryMult scale the target, reward, and injury odds.
// extraDrives: adds possessions.
// ---------------------------------------------------------------------------
export const MODIFIERS = [
  { id: 'wind', name: 'Stiff Wind', desc: 'Deep balls get knocked down — deep passes gutted.', familyMult: { [PLAY_FAMILIES.DEEP_PASS]: 0.35 } },
  { id: 'mud', name: 'Mud Bowl', desc: 'Sloppy field — runs lose 30% of their yards.', familyMult: { [PLAY_FAMILIES.INSIDE_RUN]: 0.7, [PLAY_FAMILIES.OUTSIDE_RUN]: 0.7 } },
  { id: 'rivalry', name: 'Rivalry Game', desc: 'Chippy and dangerous — 2× injury risk, but +50% cash.', injuryMult: 2, cashMult: 1.5 },
  { id: 'shootout', name: 'Shootout', desc: 'Track meet — target +30%, but cash is doubled.', targetMult: 1.3, cashMult: 2 },
  { id: 'primetime', name: 'Prime Time', desc: 'Extra possession under the lights — +1 drive, target +15%.', extraDrives: 1, targetMult: 1.15 },
  { id: 'lockdown', name: 'Lockdown Secondary', desc: 'Elite DBs — all passes lose 25% of their yards.', familyMult: { [PLAY_FAMILIES.SHORT_PASS]: 0.75, [PLAY_FAMILIES.DEEP_PASS]: 0.75 } },
];

export function pickModifier() {
  return MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
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
