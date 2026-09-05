// Controller: screen flow + action wiring.

import {
  CONFIG, PLAYS, COACHES, playById, coachById,
  gameReward, upgradeCost, fandomUpgradeCost, randomTeamName,
} from './data.js';
import * as State from './state.js';
import * as Engine from './engine.js';
import * as UI from './ui.js';
import { pickN, weighted } from './rng.js';

let run = null;
let game = null;
let shop = null;
let opponent = '';
let busy = false; // lock input during drive transitions

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  const saved = State.load();
  UI.renderTitle(actions, !!saved);
}

// ---------------------------------------------------------------------------
// Shop construction
// ---------------------------------------------------------------------------
const RARITY_COST = { common: 3, uncommon: 5, rare: 8 };
const RARITY_WEIGHT = { common: 5, uncommon: 3, rare: 1.3 };

function buildShop() {
  const playOffers = pickN(PLAYS, PLAYS.length)
    .map((p) => ({ p, w: RARITY_WEIGHT[p.rarity] }))
    .sort((a, b) => b.w * Math.random() - a.w * Math.random())
    .slice(0, 3)
    .map(({ p }) => ({ id: p.id, cost: RARITY_COST[p.rarity], bought: false }));

  const available = COACHES.filter((c) => !State.hasCoach(run, c.id));
  const coachOffers = pickN(available, Math.min(2, available.length)).map((c) => ({ id: c.id, cost: c.cost, bought: false }));

  shop = { plays: playOffers, coaches: coachOffers };
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
function startNextGame() {
  opponent = randomTeamName();
  game = Engine.startGame(run);
  Engine.beginDrive(game, run);
  busy = false;
  renderGameScreen();
}

function renderGameScreen() {
  UI.renderGame(run, game, actions, { opponent });
}

function callPlay(id) {
  if (busy || game.over) return;
  const result = Engine.resolvePlay(game, run, id);
  renderGameScreen();

  if (game.driveOver) {
    busy = true;
    setTimeout(() => {
      if (game.over) {
        endGame();
      } else {
        Engine.beginDrive(game, run);
        busy = false;
        renderGameScreen();
      }
    }, 1300);
  }
}

function endGame() {
  const injury = Engine.rollInjury(run);
  const info = { injury, reward: 0, advancedRound: false };

  if (game.won) {
    const eff = State.coachEffects(run);
    info.reward = gameReward(run.round, run.gameIndex, run.fandomTier) + eff.winCash;
    run.cash += info.reward;
    const adv = State.advanceAfterWin(run);
    info.advancedRound = adv.advancedRound;
    State.save(run);
  } else {
    run.dead = true;
    State.clearSave();
  }
  UI.renderResults(run, game, info, actions);
}

// ---------------------------------------------------------------------------
// Shop actions
// ---------------------------------------------------------------------------
function toShop() {
  buildShop();
  State.save(run);
  UI.renderShop(run, shop, actions);
}

function upgradePlayer(posId) {
  const p = State.rosterPos(run, posId);
  const cost = upgradeCost(p.rating);
  if (run.cash < cost || p.rating >= CONFIG.maxRating) return;
  run.cash -= cost;
  p.rating = Math.min(CONFIG.maxRating, p.rating + CONFIG.ratingPerUpgrade);
  State.save(run);
  UI.renderShop(run, shop, actions);
}

function upgradeFandom() {
  const cost = fandomUpgradeCost(run.fandomTier);
  if (run.cash < cost) return;
  run.cash -= cost;
  run.fandomTier += 1;
  State.save(run);
  UI.renderShop(run, shop, actions);
}

function buyPlay(entry) {
  if (entry.bought || run.cash < entry.cost) return;
  run.cash -= entry.cost;
  run.deck.push(entry.id);
  entry.bought = true;
  State.save(run);
  UI.renderShop(run, shop, actions);
}

function buyCoach(entry) {
  if (entry.bought || State.hasCoach(run, entry.id) || run.cash < entry.cost) return;
  run.cash -= entry.cost;
  run.coaches.push(entry.id);
  entry.bought = true;
  State.save(run);
  UI.renderShop(run, shop, actions);
}

function reroll() {
  if (run.cash < CONFIG.rerollCost) return;
  run.cash -= CONFIG.rerollCost;
  buildShop();
  State.save(run);
  UI.renderShop(run, shop, actions);
}

// ---------------------------------------------------------------------------
// Top-level actions
// ---------------------------------------------------------------------------
function newRun() {
  run = State.newRun();
  State.save(run);
  startNextGame();
}

function continueRun() {
  const saved = State.load();
  if (!saved) {
    newRun();
    return;
  }
  run = saved;
  toShop(); // resume in the locker room before the next game
}

const actions = {
  newRun,
  continueRun,
  callPlay,
  toShop,
  startNextGame,
  upgradePlayer,
  upgradeFandom,
  buyPlay,
  buyCoach,
  reroll,
};

boot();
