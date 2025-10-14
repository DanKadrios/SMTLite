// Minimal SMT-style battle engine

class Actor {
  constructor(name, hp, atk, defense, skills=[], element='neutral', affinities=null){
    this.name = name; this.hp = hp; this.maxhp = hp; this.atk = atk; this.def = defense; this.skills = skills; this.alive = true; this.element = element;
    // affinities: optional map of element -> multiplier (overrides default table)
    this.affinities = affinities; // e.g. { fire:2, ice:0.5 }
  }
}

// Note: SMT games use per-enemy affinity tables rather than a single "type" table.
// We treat each Actor's `affinities` map as authoritative. If an actor does not
// define an affinity for an incoming element, the attack is treated as neutral (x1).
function getMultiplier(attEl, defender){
  // if defender has per-actor affinities mapping and it contains the element, use it
  if(defender && defender.affinities && attEl in defender.affinities) {
    return { mult: defender.affinities[attEl], override:true };
  }
  // No per-actor affinity defined -> neutral by default
  return { mult: 1, override:false };
}

// Skills: { name, power, element }

function damage(attacker, defender, power=10, element='physical'){
  // base numeric damage
  const base = attacker.atk + power - defender.def;
  const variability = Math.floor((Math.random()*2-1) * Math.max(1, Math.abs(base)*0.12));
  let raw = Math.max(1, base + variability);
  const gm = getMultiplier(element, defender);
  const mult = gm.mult;
  const dmg = Math.max(1, Math.round(raw * mult));
  defender.hp = Math.max(0, defender.hp - dmg);
  if(defender.hp <= 0) defender.alive = false;
  return { dmg, mult, usedAffinityOverride: !!(gm.override) };
}

function aiChooseMove(enemy, player){
  if(enemy.skills.length===0) return {name:'Attack', power:10, element:'physical'};
  return enemy.skills.reduce((a,b)=> a.power>b.power? a:b);
}

export { Actor, damage, aiChooseMove };
