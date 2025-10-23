// Origin (per-demon) passive skills. Kept separate from regular moves.
// These are referenced by demons' `originSkill` key.

const origins = {
  slime_origin: {
    name: 'Slime Origin', element: 'support', power: 0, type: 'passive', costType: 'none', costAmount: 0, level: 1, target: 'self', flags: ['origin','passive'],
    // passive descriptor: onTurn regen 4 HP
    passive: { on: 'turn', action: 'regen_hp', amount: 4 },
    description: 'Small HP regen each turn.'
  },
  pixie_origin: {
    name: 'Pixie Origin', element: 'support', power: 0, type: 'passive', costType: 'none', costAmount: 0, level: 1, target: 'self', flags: ['origin','passive'],
    passive: { on: 'turn', action: 'regen_mp', amount: 2 },
    description: 'Small MP regen each turn.'
  }
    ,
    'Deathly Affliction': {
      name: 'Deathly Affliction',
      element: 'support',
      power: null,
      type: 'passive',
      costType: 'none',
      costAmount: 0,
      level: 1,
      target: 'self',
      flags: ['origin', 'passive'],
      passive: {
        on: 'attack',
        action: 'boost_accuracy_crit',
        condition: 'enemy_has_ailment',
        accuracyMultiplier: 1.5,
        critMultiplier: 1.5
      },
      description: 'Ally accuracy x1.5 and crit rate x1.5 against foes with ailments.'
    },
    'Demonic Meditation': {
      name: 'Demonic Meditation',
      element: 'support',
      power: null,
      type: 'passive',
      costType: 'none',
      costAmount: 0,
      level: 1,
      target: 'self',
      flags: ['origin', 'passive'],
      passive: null,
      description: 'No effect (negotiation not implemented).'
    }
};

export default origins;
