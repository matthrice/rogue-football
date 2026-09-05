// Game & drive resolution. A "game" object is transient state for one football
// game; the caller drives it via startGame -> beginDrive -> resolvePlay.

import { CONFIG, MATCHUP, DEFENSES, PLAY_FAMILIES, GAME_NAMES, playById, targetScore, pickModifier } from './data.js';
import { effectiveRating, coachEffects, playLevel } from './state.js';
import { randInt, randFloat, pick, pickN, chance } from './rng.js';

const RUN_FAMILIES = [PLAY_FAMILIES.INSIDE_RUN, PLAY_FAMILIES.OUTSIDE_RUN];

function isRun(family) {
  return RUN_FAMILIES.includes(family);
}

export function startGame(run) {
  // Away games (index 2) carry a random boss modifier.
  const modifier = run.gameIndex === 2 ? pickModifier() : null;
  let target = targetScore(run.round, run.gameIndex);
  if (modifier?.targetMult) target = Math.round(target * modifier.targetMult);
  const drivesTotal = CONFIG.drivesPerGame + (modifier?.extraDrives || 0);

  return {
    round: run.round,
    gameIndex: run.gameIndex,
    name: GAME_NAMES[run.gameIndex],
    modifier,
    drivesTotal,
    target,
    score: 0,
    driveNum: 0,
    over: false,
    won: false,
    // per-drive fields set in beginDrive:
    ballOn: 0,
    down: 1,
    toGo: 10,
    firstDownLine: 0,
    hand: [],
    defense: null,
    driveOver: false,
    lastResult: null,
  };
}

function drawHand(run) {
  const size = CONFIG.handSize + coachEffects(run).handBonus;
  return pickN(run.deck, Math.min(size, run.deck.length)).map((id) => id);
}

function chooseDefense() {
  return pick([DEFENSES.RUN_STUFF, DEFENSES.BALANCED, DEFENSES.PASS_COVER]);
}

// Start a new drive. Returns whether the game continues (false => no drives left).
export function beginDrive(game, run) {
  if (game.driveNum >= game.drivesTotal) {
    game.over = true;
    game.won = game.score >= game.target;
    return false;
  }
  game.driveNum += 1;
  game.ballOn = CONFIG.driveStartYard;
  game.down = 1;
  game.firstDownLine = Math.min(100, game.ballOn + CONFIG.firstDownYards);
  game.toGo = game.firstDownLine - game.ballOn;
  game.driveOver = false;
  game.lastResult = null;
  refreshCall(game, run);
  return true;
}

// Draw a fresh hand + defense for the next play.
function refreshCall(game, run) {
  game.hand = drawHand(run);
  game.defense = chooseDefense();
}

function ratingFactor(run, positions) {
  const avg = positions.reduce((s, p) => s + effectiveRating(run, p), 0) / positions.length;
  return avg / 70; // centered at 70 => factor 1.0
}

// Resolve one play. Mutates game. Returns a result object for the UI.
export function resolvePlay(game, run, playId) {
  const play = playById(playId);
  const eff = coachEffects(run);
  const defense = game.defense;
  const matchup = MATCHUP[play.family][defense];

  const raw = randInt(play.base[0], play.base[1]);
  const rf = ratingFactor(run, play.positions);
  const coachMult = isRun(play.family) ? eff.runMult : eff.passMult;
  const levelMult = 1 + playLevel(run, play.id) * CONFIG.playLevelYardBonus;
  const luck = randFloat(0.8, 1.25);

  // Boss modifier: per-family yard multiplier or a hard disable.
  const mod = game.modifier;
  const disabled = mod?.disableFamilies?.includes(play.family);
  const modMult = disabled ? 0 : mod?.familyMult?.[play.family] ?? 1;

  let yards = Math.round(raw * matchup * rf * coachMult * levelMult * modMult * luck);

  // Incompletions / stuffs: a bad matchup can produce nothing.
  const incomplete = !isRun(play.family) && yards <= 0;
  if (incomplete) yards = 0;
  if (yards < -3) yards = -3;

  // Turnover chance — worse on bad matchups and deep shots.
  let toChance = 0.03;
  if (matchup < 0.7) toChance += 0.08;
  if (play.family === PLAY_FAMILIES.DEEP_PASS) toChance += 0.04;
  const turnover = chance(toChance);

  const result = {
    play,
    defense,
    matchup,
    matchupLabel: matchupLabel(matchup),
    yards,
    incomplete,
    turnover: false,
    event: 'gain', // gain | firstdown | td | fg | miss | turnover | downs
    points: 0,
    message: '',
  };

  if (turnover) {
    result.turnover = true;
    result.event = 'turnover';
    result.message = play.family.includes('Pass') || play.family === PLAY_FAMILIES.PLAY_ACTION ? 'Intercepted!' : 'Fumble — lost!';
    endDrive(game);
    game.lastResult = result;
    return result;
  }

  game.ballOn = Math.max(1, game.ballOn + yards);

  // Touchdown
  if (game.ballOn >= 100) {
    game.score += CONFIG.touchdownPoints;
    result.event = 'td';
    result.points = CONFIG.touchdownPoints;
    result.message = 'TOUCHDOWN!';
    endDrive(game);
    game.lastResult = result;
    return result;
  }

  // First down?
  if (game.ballOn >= game.firstDownLine) {
    game.down = 1;
    game.firstDownLine = Math.min(100, game.ballOn + CONFIG.firstDownYards);
    game.toGo = game.firstDownLine - game.ballOn;
    result.event = 'firstdown';
    result.message = incomplete ? 'Incomplete' : `+${yards} — First down!`;
    refreshCall(game, run);
    game.lastResult = result;
    return result;
  }

  // No first down — advance the down.
  game.down += 1;
  if (game.down > 4) {
    // 4th down failed on the play just run: decide FG vs turnover on downs.
    return resolveFourthDown(game, run, result, eff);
  }

  game.toGo = game.firstDownLine - game.ballOn;
  result.message = incomplete ? 'Incomplete' : `+${yards}`;
  refreshCall(game, run);
  game.lastResult = result;
  return result;
}

// When a play leaves us past 4th down, attempt FG if in range else turnover.
function resolveFourthDown(game, run, result, eff) {
  const inRange = game.ballOn >= CONFIG.fgRangeYard;
  if (inRange) {
    const kicker = effectiveRating(run, 'K') + eff.fgBonus;
    const distanceFactor = (100 - game.ballOn) / 100; // farther = harder
    let makeChance = 0.55 + (kicker - 60) / 120 - distanceFactor * 0.6 + eff.fgBonus / 200;
    makeChance = Math.min(0.97, Math.max(0.15, makeChance));
    if (chance(makeChance)) {
      game.score += CONFIG.fieldGoalPoints;
      result.event = 'fg';
      result.points = CONFIG.fieldGoalPoints;
      result.message = 'Field goal is GOOD! +3';
    } else {
      result.event = 'miss';
      result.message = 'Field goal is NO GOOD.';
    }
  } else {
    result.event = 'downs';
    result.message = 'Turnover on downs.';
  }
  endDrive(game);
  game.lastResult = result;
  return result;
}

function endDrive(game) {
  game.driveOver = true;
  if (game.driveNum >= game.drivesTotal) {
    game.over = true;
    game.won = game.score >= game.target;
  }
}

function matchupLabel(m) {
  if (m >= 1.4) return 'Great matchup';
  if (m >= 1.05) return 'Good matchup';
  if (m >= 0.85) return 'Even';
  return 'Shut down';
}

// Roll for an injury at game end. Mutates run.injuries. Returns injury or null.
export function rollInjury(run, game) {
  const eff = coachEffects(run);
  const modMult = game?.modifier?.injuryMult || 1;
  if (!chance(CONFIG.injuryChancePerGame * eff.injuryMult * modMult)) return null;
  const posId = pick(run.roster.map((p) => p.id));
  const hit = randInt(CONFIG.injuryRatingHit[0], CONFIG.injuryRatingHit[1]);
  run.injuries.push({ posId, hit });
  const label = run.roster.find((p) => p.id === posId)?.label ?? posId;
  return { posId, label, hit };
}
