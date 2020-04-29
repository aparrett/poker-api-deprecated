// Currently using the term "FACE" to describe faces and numbers for lack of a better term.
exports.FACES = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
exports.suits = ['S', 'D', 'C', 'H']

const DECK = []
exports.FACES.forEach(face => {
    exports.suits.forEach(suit => {
        DECK.push(face + suit)
    })
})
exports.DECK = DECK

exports.PREFLOP = 'PREFLOP'
exports.FLOP = 'FLOP'
exports.TURN = 'TURN'
exports.RIVER = 'RIVER'

exports.phases = [exports.PREFLOP, exports.FLOP, exports.TURN, exports.RIVER]

exports.strengthTypes = [
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'T',
    'J',
    'Q',
    'K',
    'A',
    'PAIR',
    'TWO_PAIRS',
    'TRIPS',
    'STRAIGHT',
    'FLUSH',
    'FULL_HOUSE',
    'QUADS',
    'STRAIGHT_FLUSH',
    'ROYAL_FLUSH'
]

// Assigns strengths to each card and hand type to make it easier to compare hand strengths.
// Strengths are in powers of ten so they'll never conflict.
// Starts at 10 ^ -3 because 10 ^ -4 is unsafe.
// ex output: { '2': 0.01, '3': 0.1, '4': 1.0 }
const strengthValues = {}

exports.strengthTypes.forEach((st, i) => (strengthValues[st] = Math.pow(10, i - 3)))
exports.strengthValues = strengthValues
