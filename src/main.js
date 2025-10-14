import { Actor, damage, aiChooseMove } from './engine.js';

const player = new Actor('Hero', 120, 20, 8, [{name:'Slash', power:14, element:'physical'},{name:'Fireball', power:18, element:'fire'}], null);

// placeholder enemy: no opponent selected yet
const enemy = new Actor('No Opponent', 0, 0, 0, [], null, {});

function $(id){ return document.getElementById(id); }

const ELEMENT_NAMES = {
  fire: 'Fire', ice: 'Ice', elec: 'Electric', electric: 'Electric', force: 'Force', light: 'Light',
  physical: 'Physical', dark: 'Dark', bless: 'Bless', poison: 'Poison'
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

function updateUI(){
  $('pname').textContent = player.name; $('php').textContent = player.hp; $('pmaxhp').textContent = player.maxhp;
  // remove element labels (we rely on per-skill elements and per-actor affinities)
  $('pmore').textContent = '';
  $('ename').textContent = enemy.name; $('ehp').textContent = enemy.hp; $('emaxhp').textContent = enemy.maxhp;
  // show explicit affinities (per-actor). If none set, show "none".
  const affHtml = formatAffinities(enemy.affinities);
  $('emore').innerHTML = `Affinities: ${affHtml}`;
  $('phpfill').style.width = Math.max(0, (player.hp/player.maxhp)*100) + '%';
  $('ehpfill').style.width = Math.max(0, (enemy.hp/enemy.maxhp)*100) + '%';
}

// Enemy templates (expandable)
const enemyTemplates = {
  slime: {
    name: 'Slime', hp: 90, atk: 10, def: 4,
    skills: [{name:'Tackle', power:8, element:'physical'},{name:'Bubble', power:10, element:'ice'}],
    affinities: { fire:2, ice:2, elec:2, force:2, light:2 }
  }
};

function setEnemyByKey(key){
  const t = enemyTemplates[key];
  if(!t) return;
  // overwrite enemy object properties so references remain valid
  enemy.name = t.name; enemy.maxhp = t.hp; enemy.hp = t.hp; enemy.atk = t.atk; enemy.def = t.def; enemy.skills = t.skills; enemy.affinities = t.affinities;
  updateUI(); log(`Enemy set to ${enemy.name}`);
  // start the battle immediately after opponent is set
  startBattle();
}

// populate enemy select dropdown
function setupEnemySelect(){
  const sel = document.getElementById('enemySelect');
  // first option is a placeholder
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = '-- select an enemy --'; placeholder.selected = true; placeholder.disabled = true; sel.appendChild(placeholder);
  Object.keys(enemyTemplates).forEach(k=>{ const opt = document.createElement('option'); opt.value = k; opt.textContent = enemyTemplates[k].name; sel.appendChild(opt); });
  // don't auto-apply selection; user must click Set Opponent
  const btn = document.getElementById('setEnemyBtn');
  btn.addEventListener('click', ()=>{
    const key = sel.value; if(key) setEnemyByKey(key);
  });
}

function log(msg){ const el = $('log'); el.innerHTML = msg + '<br/>' + el.innerHTML; }

function startBattle(){ player.hp = player.maxhp; player.alive = true; enemy.hp = enemy.maxhp; enemy.alive = true; $('moves').innerHTML = ''; player.skills.forEach(s=>{ const b = document.createElement('button'); b.textContent = `${s.name} (${s.power})`; b.onclick = ()=>{ playerAction(s); }; $('moves').appendChild(b); }); updateUI(); log('Battle started'); }

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

function playerAction(skill){
  if(!player.alive || !enemy.alive) return;
  const res = damage(player, enemy, skill.power, skill.element || 'physical');
  const effectLabel = res.mult > 1 ? ' (super effective!)' : res.mult < 1 ? ' (resisted)' : '';
  const affinityLabel = res.usedAffinityOverride ? ` [affinity x${res.mult}]` : '';
  log(`${player.name} used ${skill.name}, dealt ${res.dmg} dmg${effectLabel}${affinityLabel}`);
  updateUI(); if(!enemy.alive){ log(`${enemy.name} was defeated!`); return; }
  // enemy turn
  setTimeout(()=>{ const ai = aiChooseMove(enemy, player); const aires = damage(enemy, player, ai.power, ai.element || 'physical'); const eEffect = aires.mult > 1 ? ' (super effective!)' : aires.mult < 1 ? ' (resisted)' : ''; const eAffinity = aires.usedAffinityOverride ? ` [affinity x${aires.mult}]` : ''; log(`${enemy.name} used ${ai.name}, dealt ${aires.dmg} dmg${eEffect}${eAffinity}`); updateUI(); if(!player.alive) log(`${player.name} was defeated!`); }, 500);
}

window.addEventListener('DOMContentLoaded', ()=>{
  $('reset').addEventListener('click', ()=>{
    // clear current opponent and stop the battle until an opponent is chosen
    enemy.name = 'No Opponent'; enemy.maxhp = 0; enemy.hp = 0; enemy.atk = 0; enemy.def = 0; enemy.skills = []; enemy.affinities = {};
    updateUI(); log('Opponent cleared. Choose an enemy and click Set Opponent.');
  });
  // expose objects/helpers for quick debugging from the browser console
  window.player = player;
  window.enemy = enemy;
  window.setAffinitiesFromString = setAffinitiesFromString;
  setupEnemySelect();
  // don't start automatically; wait for player to pick and set an opponent
});
