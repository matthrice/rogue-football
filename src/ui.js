// Rendering. Pure-ish view functions that take state and an `actions` object of
// callbacks wired up in main.js. Screens are swapped by toggling [hidden].

import {
  CONFIG, DEFENSES, GAME_NAMES, playById, coachById,
  targetScore, upgradeCost, fandomUpgradeCost,
} from './data.js';
import { effectiveRating, isInjured, hasCoach } from './state.js';

const app = () => document.getElementById('app');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function clear() {
  app().innerHTML = '';
}

// -------------------------------------------------------------------------
// Title
// -------------------------------------------------------------------------
export function renderTitle(actions, hasSave) {
  clear();
  const wrap = el('div', 'screen title-screen');
  wrap.append(el('h1', 'logo', '🏈 GRIDIRON'));
  wrap.append(el('p', 'tagline', 'A football roguelike'));

  if (hasSave) {
    const cont = el('button', 'btn btn-primary', 'Continue Run');
    cont.onclick = actions.continueRun;
    wrap.append(cont);
  }
  const nw = el('button', 'btn ' + (hasSave ? 'btn-secondary' : 'btn-primary'), 'New Run');
  nw.onclick = actions.newRun;
  wrap.append(nw);

  const help = el('div', 'help');
  help.innerHTML = `
    <p><b>How to play.</b> Beat each opponent's target score with ${CONFIG.drivesPerGame} drives.
    Call a play; the defense counters. Runs beat coverage, passes beat blitzes,
    play-action punishes the blitz. Win all 3 games in a round to advance.</p>
    <p>Between games, spend cash to buy plays, upgrade players, grow your fandom,
    and hire coaches.</p>`;
  wrap.append(help);
  app().append(wrap);
}

// -------------------------------------------------------------------------
// Game screen
// -------------------------------------------------------------------------
export function renderGame(run, game, actions, opts = {}) {
  clear();
  const wrap = el('div', 'screen game-screen');

  // Header: opponent, score vs target, drive count
  const header = el('div', 'game-header');
  const left = el('div', 'gh-left');
  left.append(el('div', 'opp-name', `${GAME_NAMES[game.gameIndex]} vs ${opts.opponent || 'Opponent'}`));
  left.append(el('div', 'round-tag', `Round ${game.round}`));
  const right = el('div', 'gh-right');
  const scoreLine = el('div', 'score-line');
  scoreLine.innerHTML = `<span class="score">${game.score}</span> / <span class="target">${game.target}</span>`;
  right.append(scoreLine);
  right.append(el('div', 'drive-tag', `Drive ${game.driveNum}/${CONFIG.drivesPerGame}`));
  header.append(left, right);
  wrap.append(header);

  // Progress toward target
  const bar = el('div', 'target-bar');
  const fill = el('div', 'target-fill');
  fill.style.width = Math.min(100, (game.score / game.target) * 100) + '%';
  bar.append(fill);
  wrap.append(bar);

  // Field
  wrap.append(renderField(game));

  // Down & distance
  const dd = el('div', 'down-distance');
  const toGoTxt = game.firstDownLine >= 100 ? 'Goal' : game.toGo;
  dd.textContent = `${ordinal(game.down)} & ${toGoTxt} · Ball on ${yardLabel(game.ballOn)}`;
  wrap.append(dd);

  // Defense read — shown so the player can audible into the right counter.
  const defBox = el('div', 'defense-read telegraph');
  defBox.innerHTML = `Defense shows: <b>${game.defense}</b> <span class="def-hint">${defenseHint(game.defense)}</span>`;
  wrap.append(defBox);

  // Last result banner
  if (game.lastResult) {
    const r = game.lastResult;
    const banner = el('div', 'result-banner ' + resultClass(r.event));
    banner.textContent = r.message;
    wrap.append(banner);
  }

  // Hand of plays
  const hand = el('div', 'hand');
  game.hand.forEach((id, idx) => {
    const p = playById(id);
    const card = el('button', 'play-card');
    card.append(el('div', 'pc-name', p.name));
    card.append(el('div', 'pc-family', p.family));
    card.append(el('div', 'pc-desc', p.desc));
    card.onclick = () => actions.callPlay(id, idx);
    hand.append(card);
  });
  wrap.append(el('div', 'hand-label', 'Call your play:'));
  wrap.append(hand);

  app().append(wrap);
}

function renderField(game) {
  const field = el('div', 'field');
  // endzones
  field.append(el('div', 'endzone ez-own'));
  const strip = el('div', 'field-strip');
  for (let i = 10; i < 100; i += 10) {
    const line = el('div', 'yard-line');
    line.style.left = i + '%';
    strip.append(line);
  }
  // first down marker
  const fd = el('div', 'first-down-marker');
  fd.style.left = game.firstDownLine + '%';
  strip.append(fd);
  // ball
  const ball = el('div', 'ball');
  ball.style.left = game.ballOn + '%';
  ball.textContent = '🏈';
  strip.append(ball);
  field.append(strip);
  field.append(el('div', 'endzone ez-opp'));
  return field;
}

// -------------------------------------------------------------------------
// Results screen
// -------------------------------------------------------------------------
export function renderResults(run, game, info, actions) {
  clear();
  const wrap = el('div', 'screen results-screen');
  wrap.append(el('h2', game.won ? 'result-win' : 'result-loss', game.won ? 'WIN' : 'LOSS'));
  wrap.append(el('div', 'final-score', `Final: ${game.score} — Target: ${game.target}`));

  if (info.injury) {
    const inj = el('div', 'injury-note');
    inj.innerHTML = `🩹 <b>${info.injury.label}</b> injured (-${info.injury.hit} rating this round).`;
    wrap.append(inj);
  }

  if (game.won) {
    wrap.append(el('div', 'cash-note', `💰 +$${info.reward} earned`));
    const btn = el('button', 'btn btn-primary', info.advancedRound ? `To the Locker Room (Round ${run.round})` : 'To the Locker Room');
    btn.onclick = actions.toShop;
    wrap.append(btn);
  } else {
    wrap.append(el('div', 'gameover-note', `Your run ends in Round ${game.round}.`));
    const btn = el('button', 'btn btn-primary', 'New Run');
    btn.onclick = actions.newRun;
    wrap.append(btn);
  }
  app().append(wrap);
}

// -------------------------------------------------------------------------
// Shop / locker room
// -------------------------------------------------------------------------
export function renderShop(run, shop, actions) {
  clear();
  const wrap = el('div', 'screen shop-screen');

  const head = el('div', 'shop-head');
  head.append(el('h2', null, 'Locker Room'));
  const money = el('div', 'money');
  money.innerHTML = `💰 $${run.cash} &nbsp;·&nbsp; 📣 Fandom ${run.fandomTier}`;
  head.append(money);
  const next = GAME_NAMES[run.gameIndex];
  head.append(el('div', 'next-game', `Next up: ${next} — Round ${run.round} (target ${targetScore(run.round, run.gameIndex)})`));
  wrap.append(head);

  // Roster
  wrap.append(el('h3', 'shop-sec', 'Upgrade Players'));
  const roster = el('div', 'roster-grid');
  run.roster.forEach((p) => {
    const cost = upgradeCost(p.rating);
    const cardEl = el('div', 'roster-card');
    const injured = isInjured(run, p.id);
    cardEl.append(el('div', 'rc-label', p.label + (injured ? ' 🩹' : '')));
    const effR = effectiveRating(run, p.id);
    cardEl.append(el('div', 'rc-rating', injured ? `${p.rating} (${effR} now)` : `${p.rating}`));
    const btn = el('button', 'btn btn-small', `+${CONFIG.ratingPerUpgrade}  $${cost}`);
    btn.disabled = run.cash < cost || p.rating >= CONFIG.maxRating;
    btn.onclick = () => actions.upgradePlayer(p.id);
    cardEl.append(btn);
    roster.append(cardEl);
  });
  wrap.append(roster);

  // Fandom
  wrap.append(el('h3', 'shop-sec', 'Fandom'));
  const fandomBox = el('div', 'fandom-box');
  const fCost = fandomUpgradeCost(run.fandomTier);
  fandomBox.append(el('div', 'fandom-desc', `Higher fandom = more cash per win (+$${CONFIG.fandomIncomePerTier}/tier).`));
  const fBtn = el('button', 'btn btn-small', `Grow Fandom → ${run.fandomTier + 1}   $${fCost}`);
  fBtn.disabled = run.cash < fCost;
  fBtn.onclick = actions.upgradeFandom;
  fandomBox.append(fBtn);
  wrap.append(fandomBox);

  // Plays for sale
  wrap.append(el('h3', 'shop-sec', 'Playbook (add to deck)'));
  const playRow = el('div', 'shop-row');
  shop.plays.forEach((entry) => {
    const p = playById(entry.id);
    const card = el('div', 'shop-card');
    card.append(el('div', 'sc-name', p.name));
    card.append(el('div', 'sc-family', p.family));
    card.append(el('div', 'sc-desc', p.desc));
    const btn = el('button', 'btn btn-small', entry.bought ? 'Bought' : `Buy  $${entry.cost}`);
    btn.disabled = entry.bought || run.cash < entry.cost;
    btn.onclick = () => actions.buyPlay(entry);
    card.append(btn);
    playRow.append(card);
  });
  wrap.append(playRow);

  // Coaches
  wrap.append(el('h3', 'shop-sec', 'Coaches (passive perks)'));
  const coachRow = el('div', 'shop-row');
  shop.coaches.forEach((entry) => {
    const c = coachById(entry.id);
    const card = el('div', 'shop-card coach-card');
    card.append(el('div', 'sc-name', c.name));
    card.append(el('div', 'sc-desc', c.desc));
    const owned = hasCoach(run, c.id);
    const btn = el('button', 'btn btn-small', owned ? 'Hired' : entry.bought ? 'Bought' : `Hire  $${entry.cost}`);
    btn.disabled = owned || entry.bought || run.cash < entry.cost;
    btn.onclick = () => actions.buyCoach(entry);
    card.append(btn);
    coachRow.append(card);
  });
  wrap.append(coachRow);

  // Footer: reroll + continue
  const footer = el('div', 'shop-footer');
  const reroll = el('button', 'btn btn-secondary', `Reroll  $${CONFIG.rerollCost}`);
  reroll.disabled = run.cash < CONFIG.rerollCost;
  reroll.onclick = actions.reroll;
  footer.append(reroll);
  const play = el('button', 'btn btn-primary', `Play ${next} →`);
  play.onclick = actions.startNextGame;
  footer.append(play);
  wrap.append(footer);

  app().append(wrap);
}

// -------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------
function ordinal(n) {
  return ['', '1st', '2nd', '3rd', '4th'][n] || n + 'th';
}

// Convert 0..100 internal to football yard label (own 25 .. 50 .. opp 25).
function yardLabel(on) {
  if (on === 50) return '50';
  if (on < 50) return `Own ${on}`;
  return `Opp ${100 - on}`;
}

function defenseHint(def) {
  if (def === DEFENSES.RUN_STUFF) return '— beat it by passing';
  if (def === DEFENSES.PASS_COVER) return '— beat it by running';
  return '— balanced, anything works';
}

function resultClass(event) {
  if (event === 'td') return 'rb-td';
  if (event === 'fg') return 'rb-fg';
  if (event === 'firstdown') return 'rb-first';
  if (event === 'turnover' || event === 'downs' || event === 'miss') return 'rb-bad';
  return 'rb-gain';
}
