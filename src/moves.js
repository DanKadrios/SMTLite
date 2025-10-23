// Central master list of moves. Keys are used by actors' skill lists.
// New richer schema (SMT-V like):
// { key: { name, element, power, type, costType, costAmount, level, target, flags, description } }
// type: 'attack' | 'status' | 'heal' | 'passive' | 'support'
// costType: 'none'|'mp'|'tp'
// target: 'enemy'|'all_enemies'|'self'|'ally'|'all_allies'

const moves = {
  // Note: generic placeholder skills removed per request. Only real SMT moves below.

    poisma: {
      name: 'Poisma',
      element: 'ailment',
      power: null,
      type: 'status',
      costType: 'mp',
      costAmount: 10,
      level: 1,
      target: 'enemy',
      flags: ['ailment', 'poison'],
      accuracy: 85,
      description: '85% chance to inflict poison ailment on one enemy.'
    },

    dustoma: {
      name: 'Dustoma',
      element: 'ailment',
      power: null,
      type: 'status',
      costType: 'mp',
      costAmount: 10,
      level: 1,
      target: 'enemy',
      flags: ['ailment', 'mirage'],
      accuracy: 75,
      description: '75% chance to inflict mirage ailment on one enemy.'
    },

    lunge: {
      name: 'Lunge',
      element: 'physical',
      power: 145,
      type: 'attack',
      costType: 'mp',
      costAmount: 5,
      level: 1,
      target: 'enemy',
      flags: [],
      accuracy: 98,
      description: 'Physical attack, 145 power, 98% accuracy, no crit chance.'
    },

    rakukaja: {
      name: 'Rakukaja',
      element: 'buff',
      power: null,
      type: 'support',
      costType: 'mp',
      costAmount: 8,
      level: 1,
      target: 'ally',
      flags: ['buff', 'defense'],
      description: 'Raises 1 ally\'s defense by one stage for 3 turns.'
    },

    zan: {
      name: 'Zan',
      element: 'force',
      power: 130,
      type: 'attack',
      costType: 'mp',
      costAmount: 10,
      level: 1,
      target: 'enemy',
      flags: [],
      accuracy: 98,
      description: 'Force attack, 130 power, 98% accuracy.'
    },

    patra: {
      name: 'Patra',
      element: 'heal',
      power: null,
      type: 'heal',
      costType: 'mp',
      costAmount: 8,
      level: 1,
      target: 'ally',
      flags: ['heal', 'cure_ailment'],
      description: 'Cures status ailments on one ally.'
    },

    dia: {
      name: 'Dia',
      element: 'heal',
      power: 35,
      type: 'heal',
      costType: 'mp',
      costAmount: 8,
      level: 1,
      target: 'ally',
      flags: ['heal'],
      bonusPercentMaxHP: 15,
      description: 'Slightly heals one ally (35 power + 15% max HP).'
    },
};

export default moves;
