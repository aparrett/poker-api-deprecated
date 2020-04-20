exports.deck = [
    'AS',
    'AD',
    'AC',
    'AH',
    'KS',
    'KD',
    'KC',
    'KH',
    'QS',
    'QD',
    'QC',
    'QH',
    'JS',
    'JD',
    'JC',
    'JH',
    '10S',
    '10D',
    '10C',
    '10H',
    '9S',
    '9D',
    '9C',
    '9H',
    '8S',
    '8D',
    '8C',
    '8H',
    '7S',
    '7D',
    '7C',
    '7H',
    '6S',
    '6D',
    '6C',
    '6H',
    '5S',
    '5D',
    '5C',
    '5H',
    '4S',
    '4D',
    '4C',
    '4H',
    '3S',
    '3D',
    '3C',
    '3H',
    '2S',
    '2D',
    '2C',
    '2H'
]

exports.PREFLOP = 'PREFLOP'
exports.FLOP = 'FLOP'
exports.TURN = 'TURN'
exports.RIVER = 'RIVER'

exports.phases = [exports.PREFLOP, exports.FLOP, exports.TURN, exports.RIVER]

exports.strengthTypes = [
    'AL',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'J',
    'Q',
    'K',
    'A',
    'PAIR',
    'TWO_PAIRS',
    'SET',
    'STRAIGHT',
    'FLUSH',
    'QUADS',
    'STRAIGHT_FLUSH',
    'ROYAL_FLUSH'
]

// Assigns strengths to each card and hand type to make it easier to compare hand strengths.
// Strengths are in powers of ten so they'll never conflict.
// Starts at 10 ^ -3 because 10 ^ -4 is unsafe.
// ex output: { 'AL': 0.001, '2': 0.01, '3': 0.1 }
const strengthValues = {}

exports.strengthTypes.forEach((st, i) => (strengthValues[st] = Math.pow(10, i - 3)))
exports.strengthValues = strengthValues
