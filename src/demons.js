// Demon templates exported separately from main. Each template contains stats, skills (keys), affinities, and optional originSkill.
const demons = {
  slime: {
    name: 'Slime', level:1,
    str:5, mag:4, vit:6, agl:3, lck:4,
    skills: ['poisma', 'dustoma', 'lunge'],
    affinities: { fire:2, ice:2, elec:2, force:2, light:2 },
    ailmentResists: { poison: 1 },
    Proficiencies: { physical:1, fire:-3, ice:-3, elec:-3, force:-3, light:-3, dark:0, almighty:0, ailment:3, heal:0, buff:0},
    originSkill: 'Deathly Affliction'
  },
  pixie: {
    name: 'Pixie', level:2,
    str:2, mag:7, vit:4, agl:8, lck:6,
    skills: ['rakukaja', 'zan', 'patra', 'dia'],
    affinities: { dark:2, force:0.5},
    ailmentResists: { stun:1},
    Proficiencies: { physical:0, fire:0, ice:0, elec:0, force:1, light:0, dark:0, almighty:0, ailment:-1, heal:1, buff:1},
    originSkill: 'Demonic Meditation'
  }
};

export default demons;
