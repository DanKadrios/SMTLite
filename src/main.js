import { Actor, damage, aiChooseMove, applyPassiveEffects, runPassiveEvent } from './engine.js';
import moves from './moves.js';
import origins from './originskills.js';
import demons from './demons.js';

// masterMoves merges regular moves and origin/passive skills so they're resolvable from anywhere
const masterMoves = Object.assign({}, moves, origins);

// player and enemies now reference moves by key (resolved at UI/runtime)
// Removed generic placeholder skills per request; start with no skills.
const player = new Actor('Hero', 120, 20, 8, [], null);

// placeholder enemy: no opponent selected yet
const enemy = new Actor('No Opponent', 0, 0, 0, [], null, {});

// Turn lock prevents the player from queuing multiple actions before the enemy responds
let turnLocked = false;

// --- DOM Cache for performance and maintainability ---
let dom = {};

/**
 * Cache frequently accessed DOM elements to avoid repeated queries.
 * Call once during DOMContentLoaded.
 */
function cacheDOM() {
  dom.moves = document.getElementById('moves');
  dom.enemyMoves = document.getElementById('enemyMoves');
  dom.log = document.getElementById('log');
  dom.pname = document.getElementById('pname');
  dom.php = document.getElementById('php');
  dom.pmaxhp = document.getElementById('pmaxhp');
  dom.pmp = document.getElementById('pmp');
  dom.pmaxmp = document.getElementById('pmaxmp');
  dom.phpfill = document.getElementById('phpfill');
  dom.pmpfill = document.getElementById('pmpfill');
  dom.pmore = document.getElementById('pmore');
  dom.ename = document.getElementById('ename');
  dom.ehp = document.getElementById('ehp');
  dom.emaxhp = document.getElementById('emaxhp');
  dom.emp = document.getElementById('emp');
  dom.emaxmp = document.getElementById('emaxmp');
  dom.ehpfill = document.getElementById('ehpfill');
  dom.empfill = document.getElementById('empfill');
  dom.emore = document.getElementById('emore');
  dom.enemySelect = document.getElementById('enemySelect');
  dom.reset = document.getElementById('reset');
}

/**
 * Resolve a skill key (string) or skill object into a complete move object.
 * Returns a safe fallback if the key is not found in masterMoves.
 */
function resolveSkill(key) {
  if (!key) return { name: 'Unknown', element: 'physical', power: 0, type: 'attack', costType: 'none', costAmount: 0, target: 'enemy', flags: [] };
  if (typeof key === 'object') return key; // already a move object
  const resolved = masterMoves[key];
  if (resolved) return resolved;
  // fallback for unknown keys
  return { name: key, element: 'physical', power: 10, type: 'attack', costType: 'none', costAmount: 0, target: 'enemy', flags: [] };
}

/**
 * Typed logging helper: 'player' (green), 'enemy' (red), 'info' (blue).
 * Prepends new messages so the latest appears at top.
 */
function log(msg, type = 'info') {
  if (!dom.log) return;
  const color = type === 'player' ? '#2e7d32' : type === 'enemy' ? '#c62828' : '#1565c0';
  const line = `<div style="color:${color};margin:4px 0">${msg}</div>`;
  dom.log.innerHTML = line + dom.log.innerHTML;
}

/**
 * Enable or disable all player move buttons.
 * Also re-evaluates which buttons should be disabled due to insufficient MP.
 */
function setMovesEnabled(enabled) {
  if (!dom.moves) return;
  const btns = dom.moves.querySelectorAll('button');
  btns.forEach(btn => {
    const costType = btn.dataset.costType || 'none';
    const costAmount = parseInt(btn.dataset.costAmount || '0', 10);
    const affordable = costType !== 'mp' || (player.mp || 0) >= costAmount;
    btn.disabled = !enabled || !affordable;
  });
}

const ELEMENT_NAMES = {
  fire: 'Fire', ice: 'Ice', elec: 'Electric', electric: 'Electric', force: 'Force',
  physical: 'Physical', dark: 'Dark', light: 'Light', ailment: 'Ailment', buff: 'Buff', almighty: 'Almighty', heal: 'Heal',

};

function fmtMult(v){
  // show integers as 2, floats as 0.5, avoid long decimals
  return (Number.isInteger(v) ? v.toString() : (Math.round(v*100)/100).toString());
}

function formatAffinities(map){
  if(!map || Object.keys(map).length===0) return 'none';
  // create small inline badges for each affinity
  return Object.entries(map).map(([k,v])=>{
    const name = ELEMENT_NAMES[k] || k;
    const mult = fmtMult(v);
    // map numeric multiplier to a readable label: Weak (>1), Strong (<1), Neutral (1)
    const label = v > 1 ? 'Weak' : v < 1 ? 'Strong' : 'Neutral';
     // color coding: red for Weak, blue for Strong, gray for Neutral
     const bg = v > 1 ? '#ffecec' : v < 1 ? '#e6f0ff' : '#f0f0f0';
     const border = v > 1 ? '#ffb3b3' : v < 1 ? '#b3c7ff' : '#ddd';
     const color = '#111';
     // choose arrow icon: up for Weak, down for Strong, dash for Neutral
     const arrow = v > 1 ? '↑' : v < 1 ? '↓' : '–';
     const arrowColor = v > 1 ? '#c00' : v < 1 ? '#0070c0' : '#666';
     // inline styles kept minimal so no external CSS needed; tooltip contains the numeric multiplier
     return `<span title="x${mult}" style="display:inline-block;padding:2px 8px;border-radius:8px;background:${bg};color:${color};margin-right:6px;font-size:0.9em;border:1px solid ${border}"><strong style="margin-right:6px;color:${arrowColor}">${arrow}</strong>${name} — ${label}</span>`;
  }).join('');
}

/**
 * Render the list of enemy moves in the side panel.
 * Dims and strikes through moves the enemy cannot afford.
 */
function renderEnemyMoves() {
  if (!dom.enemyMoves) return;
  dom.enemyMoves.innerHTML = '';
  if (!enemy || !enemy.skills || enemy.skills.length === 0) {
    dom.enemyMoves.textContent = 'No moves';
    return;
  }
  const resolved = enemy.skills.map(resolveSkill);
  resolved.forEach(s => {
    const div = document.createElement('div');
    const cost = s.costType === 'mp' ? ` — ${s.costAmount} MP` : '';
    div.textContent = `${s.name} (${s.power})${cost}`;
    const affordable = s.costType !== 'mp' || (enemy.mp || 0) >= (s.costAmount || 0);
    if (!affordable) {
      div.style.opacity = '0.4';
      div.style.textDecoration = 'line-through';
    }
    dom.enemyMoves.appendChild(div);
  });
}

/**
 * Main UI update function: syncs all DOM elements with current player/enemy state.
 * Leverages cached DOM references and helper functions for clarity.
 */
function updateUI() {
  if (!dom.pname) return; // DOM not ready
  
  // Player stats
  dom.pname.textContent = player.name;
  dom.php.textContent = player.hp;
  dom.pmaxhp.textContent = player.maxhp;
  dom.pmp.textContent = player.mp || 0;
  dom.pmaxmp.textContent = player.maxmp || 0;
  dom.phpfill.style.width = Math.max(0, (player.hp / player.maxhp) * 100) + '%';
  dom.pmpfill.style.width = Math.max(0, ((player.mp || 0) / (player.maxmp || 1)) * 100) + '%';

  const pOrigin = player.originSkill ? (masterMoves[player.originSkill]?.name || player.originSkill) : '';
  const pAff = formatAffinities(player.affinities);
  dom.pmore.innerHTML = `Origin: ${pOrigin}<br/>Affinities: ${pAff}`;

  // Enemy stats
  dom.ename.textContent = enemy.name;
  dom.ehp.textContent = enemy.hp;
  dom.emaxhp.textContent = enemy.maxhp;
  dom.emp.textContent = enemy.mp || 0;
  dom.emaxmp.textContent = enemy.maxmp || 0;
  dom.ehpfill.style.width = Math.max(0, (enemy.hp / enemy.maxhp) * 100) + '%';
  dom.empfill.style.width = Math.max(0, ((enemy.mp || 0) / (enemy.maxmp || 1)) * 100) + '%';

  const eOrigin = enemy.originSkill ? (masterMoves[enemy.originSkill]?.name || enemy.originSkill) : '';
  const eAff = formatAffinities(enemy.affinities);
  dom.emore.innerHTML = `Origin: ${eOrigin}<br/>Affinities: ${eAff}`;

  // Update move lists
  renderEnemyMoves();
  setMovesEnabled(!turnLocked);
}

// enemy templates moved to src/demons.js
const enemyTemplates = demons;

function setEnemyByKey(key){
  const t = enemyTemplates[key];
  if(!t) return;
  // overwrite enemy object properties so references remain valid
  enemy.name = t.name; enemy.maxhp = t.hp; enemy.hp = t.hp; enemy.atk = t.atk; enemy.def = t.def;
  // enforce 8-skill limit; copy skill keys, truncating if necessary
  enemy.skills = Array.isArray(t.skills) ? t.skills.slice(0,8) : [];
  enemy.affinities = t.affinities;
  // apply origin skill if present on the template
  enemy.originSkill = t.originSkill || null;
  // set MP values if provided by template
  enemy.maxmp = t.maxmp || 0; enemy.mp = t.mp || 0;
  updateUI(); log(`Enemy set to ${enemy.name}`, 'info');
  // start the battle immediately after opponent is set
  startBattle();
}

/**
 * Populate the enemy select dropdown with all available demon templates.
 * Automatically starts a battle when the user picks an enemy.
 */
function setupEnemySelect() {
  if (!dom.enemySelect) return;
  const sel = dom.enemySelect;
  // first option is a placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- select an enemy --';
  placeholder.selected = true;
  placeholder.disabled = true;
  sel.appendChild(placeholder);

  Object.keys(enemyTemplates).forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = enemyTemplates[k].name;
    sel.appendChild(opt);
  });

  // Apply selection immediately when the user changes the dropdown
  sel.addEventListener('change', () => {
    const key = sel.value;
    if (key) setEnemyByKey(key);
  });
}

/**
 * Render player move buttons from their skill list.
 * Each button stores cost metadata and calls playerAction when clicked.
 */
function renderPlayerMoves() {
  if (!dom.moves) return;
  dom.moves.innerHTML = '';
  const pskills = player.skills.map(resolveSkill);
  pskills.forEach(s => {
    const cost = s.costType === 'mp' ? `${s.costAmount} MP` : '';
    const b = document.createElement('button');
    const pow = (s.power === null || s.power === undefined) ? '' : ` (${s.power})`;
    b.textContent = `${s.name}${pow} ${cost}`.trim();
    b.dataset.costType = s.costType || 'none';
    b.dataset.costAmount = s.costAmount || 0;
    b.onclick = () => { playerAction(s); };
    dom.moves.appendChild(b);
  });
}

/**
 * Start a new battle: reset HP/MP, render moves, log passives, enable player turn.
 */
function startBattle() {
  player.hp = player.maxhp;
  player.alive = true;
  enemy.hp = enemy.maxhp;
  enemy.alive = true;

  // Initialize player MP if not set, and refill to max
  player.maxmp = player.maxmp || 20;
  player.mp = player.maxmp;

  renderPlayerMoves();

  // Log origin/passive skills if present
  const pop = applyPassiveEffects(player, masterMoves);
  if (pop) log(`${player.name} has origin/passive: ${pop.name}`, 'info');
  const eop = applyPassiveEffects(enemy, masterMoves);
  if (eop) log(`${enemy.name} has origin/passive: ${eop.name}`, 'info');

  // Start with moves enabled (player's turn)
  turnLocked = false;
  setMovesEnabled(true);
  updateUI();
  log('Battle started', 'info');
}

// Helper to set affinities manually from a short string like: "fire:2, ice:0.5"
function setAffinitiesFromString(actor, str){
  const map = {};
  str.split(',').map(s=>s.trim()).filter(Boolean).forEach(pair=>{
    const [k,v] = pair.split(':').map(x=>x.trim());
    if(k && v) map[k] = parseFloat(v);
  });
  actor.affinities = map;
  updateUI();
}

/**
 * Execute a player action (use a skill against the enemy).
 * Handles MP cost checking, damage application, passive events, and enemy turn.
 */
function playerAction(skill) {
  // Prevent input if game state not ready
  if (!player.alive || !enemy.alive) return;
  if (turnLocked) {
    log('Action ignored — waiting for enemy response.', 'info');
    return;
  }

  // Lock further player input and disable buttons immediately
  turnLocked = true;
  setMovesEnabled(false);

  // Check MP cost before executing
  if (skill.costType === 'mp') {
    const need = skill.costAmount || 0;
    if ((player.mp || 0) < need) {
      log(`${player.name} tried to use ${skill.name} but lacked ${need} MP.`, 'info');
      // Unlock so player can choose another move
      turnLocked = false;
      setMovesEnabled(true);
      return;
    }
    // Consume MP
    player.mp = Math.max(0, (player.mp || 0) - need);
  }

  // Accuracy check if provided on the skill; if not provided, treat as guaranteed hit.
  const accuracy = (typeof skill.accuracy === 'number') ? skill.accuracy : 100;
  const hitRoll = Math.random() * 100;

  // Determine action type
  if (skill.type === 'heal') {
    // If this is a status cure (e.g., Patra), clear ailments instead of HP heal
    if ((skill.flags || []).includes('cure_ailment')) {
      const had = player.status && Object.keys(player.status).length > 0;
      player.status = {};
      log(`${player.name} used ${skill.name}${had ? ', ailments cured.' : ', but no ailments to cure.'}`, 'player');
      updateUI();
    } else {
      // Heal one ally (single-ally party => caster). Amount may include flat power and a % of max HP.
      const bonusPct = skill.bonusPercentMaxHP || 0;
      const healAmt = Math.max(0, (skill.power || 0) + Math.floor(player.maxhp * (bonusPct / 100)));
      const before = player.hp;
      player.hp = Math.min(player.maxhp, player.hp + healAmt);
      log(`${player.name} used ${skill.name}, healed ${player.hp - before} HP.`, 'player');
      updateUI();
    }
  } else if (skill.type === 'support') {
    // Support: e.g., Rakukaja (DEF +1 stage for 3 turns) on one ally (caster in single-ally setup)
    // Track buff stages and duration; damage impact will be wired once per-stage multipliers are provided.
    player.buffs = player.buffs || {};
    const key = (skill.flags || []).includes('defense') ? 'defense' : 'generic';
    const prev = player.buffs[key] || { stages: 0, turns: 0 };
    player.buffs[key] = { stages: prev.stages + 1, turns: 3 };
    log(`${player.name} used ${skill.name}. ${key.toUpperCase()} rose by 1 stage for 3 turns.`, 'player');
    updateUI();
  } else if (skill.type === 'status') {
    // Status infliction with accuracy
    if (hitRoll <= accuracy) {
      const statusName = (skill.flags || []).includes('poison') ? 'poison' : ( (skill.flags || []).includes('mirage') ? 'mirage' : 'status');
      enemy.status = enemy.status || {};
      enemy.status[statusName] = true; // duration/effects TBD per user values
      log(`${player.name} used ${skill.name}. ${enemy.name} is inflicted with ${statusName}.`, 'player');
    } else {
      log(`${player.name} used ${skill.name} but it missed.`, 'player');
    }
    updateUI();
  } else {
    // Attack path with accuracy (default 100%)
    if (hitRoll <= accuracy) {
      const res = damage(player, enemy, skill.power, skill.element || 'physical');
      const effectLabel = res.mult > 1 ? ' (super effective!)' : res.mult < 1 ? ' (resisted)' : '';
      const affinityLabel = res.usedAffinityOverride ? ` [affinity x${res.mult}]` : '';
      log(`${player.name} used ${skill.name}, dealt ${res.dmg} dmg${effectLabel}${affinityLabel}`, 'player');
    } else {
      log(`${player.name} used ${skill.name} but it missed.`, 'player');
    }
    updateUI();
  }

  if (!enemy.alive) {
    // Enemy died — keep moves disabled until New Battle
    log(`${enemy.name} was defeated!`, 'info');
    setMovesEnabled(false);
    turnLocked = false;
    return;
  }

  // Run any onDamageTaken passives for the enemy (e.g., reflect, drain)
  const dmgHandlers = runPassiveEvent(enemy, 'onDamageTaken', { dmg: res.dmg, attacker: player }, masterMoves);
  dmgHandlers.forEach(r => log(r.msg, r.type));

  // Enemy turn
  setTimeout(() => {
    // Resolve enemy skill keys if necessary before AI chooses
  const eskills = enemy.skills.map(resolveSkill);
    // Pick an AI move from resolved skills
    let ai = aiChooseMove({ skills: eskills }, player);
    // If AI picked a move that costs MP but it lacks MP, try to pick a fallback
    if (ai.costType === 'mp' && (enemy.mp || 0) < (ai.costAmount || 0)) {
      const usable = eskills.find(s => !(s.costType === 'mp' && (enemy.mp || 0) < (s.costAmount || 0)));
      if (usable) ai = usable;
    }
    // Consume enemy MP if needed
    if (ai.costType === 'mp') {
      enemy.mp = Math.max(0, (enemy.mp || 0) - (ai.costAmount || 0));
    }
    // Enemy action respects accuracy and move type
    const eAcc = (typeof ai.accuracy === 'number') ? ai.accuracy : 100;
    const eHit = Math.random() * 100;
    if (ai.type === 'heal') {
      if ((ai.flags || []).includes('cure_ailment')) {
        const had = enemy.status && Object.keys(enemy.status).length > 0;
        enemy.status = {};
        log(`${enemy.name} used ${ai.name}${had ? ', ailments cured.' : ', but no ailments to cure.'}`, 'enemy');
        updateUI();
      } else {
        const bonusPct = ai.bonusPercentMaxHP || 0;
        const healAmt = Math.max(0, (ai.power || 0) + Math.floor(enemy.maxhp * (bonusPct / 100)));
        const before = enemy.hp;
        enemy.hp = Math.min(enemy.maxhp, enemy.hp + healAmt);
        log(`${enemy.name} used ${ai.name}, healed ${enemy.hp - before} HP.`, 'enemy');
        updateUI();
      }
    } else if (ai.type === 'support') {
      enemy.buffs = enemy.buffs || {};
      const k = (ai.flags || []).includes('defense') ? 'defense' : 'generic';
      const prevb = enemy.buffs[k] || { stages: 0, turns: 0 };
      enemy.buffs[k] = { stages: prevb.stages + 1, turns: 3 };
      log(`${enemy.name} used ${ai.name}. ${k.toUpperCase()} rose by 1 stage for 3 turns.`, 'enemy');
      updateUI();
    } else if (ai.type === 'status') {
      if (eHit <= eAcc) {
        const statusName = (ai.flags || []).includes('poison') ? 'poison' : ( (ai.flags || []).includes('mirage') ? 'mirage' : 'status');
        player.status = player.status || {};
        player.status[statusName] = true;
        log(`${enemy.name} used ${ai.name}. ${player.name} is inflicted with ${statusName}.`, 'enemy');
      } else {
        log(`${enemy.name} used ${ai.name} but it missed.`, 'enemy');
      }
      updateUI();
    } else {
      if (eHit <= eAcc) {
        const aires = damage(enemy, player, ai.power, ai.element || 'physical');
        const eEffect = aires.mult > 1 ? ' (super effective!)' : aires.mult < 1 ? ' (resisted)' : '';
        const eAffinity = aires.usedAffinityOverride ? ` [affinity x${aires.mult}]` : '';
        log(`${enemy.name} used ${ai.name}, dealt ${aires.dmg} dmg${eEffect}${eAffinity}`, 'enemy');
      } else {
        log(`${enemy.name} used ${ai.name} but it missed.`, 'enemy');
      }
      updateUI();
    }

    if (!player.alive) {
      // Player died — disable moves
      setMovesEnabled(false);
      turnLocked = false;
      log(`${player.name} was defeated!`, 'info');
      return;
    }
    // After enemy action, run per-turn passives (turn event) for both actors
    const pturn = runPassiveEvent(player, 'turn', {}, masterMoves);
    pturn.forEach(r => log(r.msg, r.type));
    const eturn = runPassiveEvent(enemy, 'turn', {}, masterMoves);
    eturn.forEach(r => log(r.msg, r.type));
    // Decrement buff durations
    [player, enemy].forEach(a => {
      if (!a.buffs) return;
      Object.keys(a.buffs).forEach(k => {
        a.buffs[k].turns = Math.max(0, (a.buffs[k].turns || 0) - 1);
        if (a.buffs[k].turns <= 0) delete a.buffs[k];
      });
    });
    updateUI();

    // Player's turn again
    turnLocked = false;
    setMovesEnabled(true);
  }, 500);
}

window.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements once
  cacheDOM();

  // Setup reset button
  if (dom.reset) {
    dom.reset.addEventListener('click', () => {
      // If the user has a selected template, restart with that enemy; otherwise clear opponent
      const key = dom.enemySelect ? dom.enemySelect.value : null;
      if (key && enemyTemplates[key]) {
        // Re-apply the selected template (this resets HP and restarts the battle)
        setEnemyByKey(key);
        log('New battle started with selected opponent.', 'info');
      } else {
        // Clear current opponent and stop the battle until an opponent is chosen
        enemy.name = 'No Opponent';
        enemy.maxhp = 0;
        enemy.hp = 0;
        enemy.atk = 0;
        enemy.def = 0;
        enemy.skills = [];
        enemy.affinities = {};
        updateUI();
        log('No opponent selected. Choose an enemy from the dropdown.', 'info');
      }
    });
  }

  // Expose objects/helpers for quick debugging from the browser console
  window.player = player;
  window.enemy = enemy;
  window.setAffinitiesFromString = setAffinitiesFromString;

  // Setup enemy select dropdown
  setupEnemySelect();

  // Don't start automatically; wait for player to pick and set an opponent
});
