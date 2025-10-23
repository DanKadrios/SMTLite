// Minimal SMT-style battle engine

/**
 * Basic Actor (player or enemy) model used by the engine.
 * Fields are intentionally simple so the UI code can mutate instances in-place.
 */
class Actor {
  constructor(name, hp, atk, defense, skills = [], element = 'neutral', affinities = null, originSkill = null) {
    this.name = name;
    this.maxhp = hp; this.hp = hp;
    this.atk = atk; this.def = defense;
    this.skills = skills;
    this.alive = true;
    this.element = element;

    // Resource fields (MP/TP) default to zero and can be set by templates
    this.maxmp = 0; this.mp = 0; this.tp = 0;

    // affinities: optional map of element -> multiplier (overrides default table)
    // e.g. { fire:2, ice:0.5 }
    this.affinities = affinities;

    // origin/passive skill key (string) or null
    this.originSkill = originSkill;
  }
}

// Note: SMT games use per-enemy affinity tables rather than a single "type" table.
// We treat each Actor's `affinities` map as authoritative. If an actor does not
// define an affinity for an incoming element, the attack is treated as neutral (x1).
/**
 * Resolve an actor's affinity multiplier for a given attack element.
 * Returns an object { mult, override } where `override` is true when the
 * defender provided a per-actor affinity value.
 */
function resolveAffinity(attackElement, defender) {
  if (defender && defender.affinities && attackElement in defender.affinities) {
    return { mult: defender.affinities[attackElement], override: true };
  }
  return { mult: 1, override: false };
}

// Backwards-compatible alias for existing callers
function getMultiplier(attEl, defender) {
  return resolveAffinity(attEl, defender);
}

// Skills: { name, power, element }

/**
 * Calculate and apply damage from attacker to defender.
 * Accepts either a numeric power or a skill object (with .power and .element).
 * Returns { dmg, mult, usedAffinityOverride } to allow UI to display effects.
 */
function damage(attacker, defender, power = 10, element = 'physical') {
  // support callers that pass a skill object as the `power` parameter
  let resolvedPower = power;
  let resolvedElement = element;
  if (typeof power === 'object' && power !== null) {
    resolvedPower = power.power || 0;
    resolvedElement = power.element || element || 'physical';
  }

  // compute a simple raw damage value using attacker stats and the skill power
  const base = attacker.atk + resolvedPower - defender.def;
  const variability = Math.floor((Math.random() * 2 - 1) * Math.max(1, Math.abs(base) * 0.12));
  const raw = Math.max(1, base + variability);

  // apply affinity multiplier
  const gm = resolveAffinity(resolvedElement, defender);
  const mult = gm.mult;
  const dmg = Math.max(1, Math.round(raw * mult));

  // apply damage and update alive flag
  defender.hp = Math.max(0, defender.hp - dmg);
  if (defender.hp <= 0) defender.alive = false;

  return { dmg, mult, usedAffinityOverride: !!(gm.override) };
}

// Apply passive/origin effects for an actor at start of battle or per-turn effects.
// 'moves' should be the master moves table to resolve origin skill keys.
function applyPassiveEffects(actor, moves){
  if(!actor || !actor.originSkill) return;
  const key = actor.originSkill;
  const m = moves[key];
  if(!m) return;
  // simple examples: if origin has 'passive' and description contains 'regen hp' we apply a small heal each turn
  // For now, we'll just note that passives exist; concrete per-turn hooks will be wired in main.js where the battle loop exists.
  return m;
}

// Run passive handlers for an actor for a given event.
// Returns an array of result messages: { msg, type }
/**
 * Execute passive effects defined on an actor's origin skill for a given event.
 * Returns an array of result objects { msg, type } which callers can log.
 */
function runPassiveEvent(actor, event, context = {}, moves) {
  const results = [];
  if (!actor || !actor.originSkill) return results;
  const m = moves && moves[actor.originSkill];
  if (!m || !m.passive) return results;
  const p = m.passive;
  if (p.on !== event) return results;

  // Supported passive actions: regen_hp, regen_mp, reflect, drain
  switch (p.action) {
    case 'regen_hp': {
      const amt = p.amount || 0;
      const before = actor.hp;
      actor.hp = Math.min(actor.maxhp, actor.hp + amt);
      results.push({ msg: `${actor.name} regenerates ${actor.hp - before} HP.`, type: 'info' });
      break;
    }
    case 'regen_mp': {
      const amt = p.amount || 0;
      const before = actor.mp || 0;
      actor.mp = Math.min(actor.maxmp || 0, (actor.mp || 0) + amt);
      results.push({ msg: `${actor.name} regenerates ${actor.mp - before} MP.`, type: 'info' });
      break;
    }
    case 'reflect': {
      // context should include dmg and attacker
      const dmg = context.dmg || 0;
      const attacker = context.attacker;
      if (attacker) {
        const before = attacker.hp;
        attacker.hp = Math.max(0, attacker.hp - Math.round(dmg * (p.amount || 1)));
        if (attacker.hp <= 0) attacker.alive = false;
        results.push({ msg: `${actor.name} reflects ${before - attacker.hp} damage back to ${attacker.name}.`, type: 'info' });
      }
      break;
    }
    case 'drain': {
      // context should include dmg and attacker
      const dmg = context.dmg || 0;
      const attacker = context.attacker;
      if (attacker) {
        const heal = Math.round(dmg * (p.amount || 1));
        const before = attacker.hp;
        attacker.hp = Math.min(attacker.maxhp, attacker.hp + heal);
        results.push({ msg: `${attacker.name} drains ${attacker.hp - before} HP from ${actor.name}.`, type: 'info' });
      }
      break;
    }
    default:
      // unknown passive action — ignore for now
      break;
  }

  return results;
}

// Note: enemy.skills may be either skill objects or keys referencing a central moves table.
// We resolve keys if necessary by the caller (main) or consumers; keep ai simple and resilient.
/**
 * Simple AI: pick the skill with the highest declared power.
 * The function is resilient to being passed either skill objects or already-resolved entries.
 */
function aiChooseMove(enemy, player) {
  if (!enemy || !enemy.skills || enemy.skills.length === 0) return { name: 'Attack', power: 10, element: 'physical' };

  // Normalize entries to objects that have a numeric `.power` field for comparison.
  const normalized = enemy.skills.map((s) => {
    if (!s) return { name: 'Attack', power: 10, element: 'physical' };
    if (typeof s === 'string') return { name: s, power: 10, element: 'physical' };
    return s;
  });

  let best = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    const cand = normalized[i];
    const bestPower = (best && typeof best.power === 'number') ? best.power : 0;
    const candPower = (cand && typeof cand.power === 'number') ? cand.power : 0;
    if (candPower > bestPower) best = cand;
  }

  return best || { name: 'Attack', power: 10, element: 'physical' };
}

export { Actor, damage, aiChooseMove, applyPassiveEffects, runPassiveEvent };
