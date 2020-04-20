const { incrementTurn, incrementPhase, determineBetterHand } = require('../src/service/gameService')
const { PREFLOP, FLOP, RIVER, strengthValues } = require('../src/constants')

describe('gameService', () => {
    const game = { players: [], usedCards: [] }
    game.players.set = (index, player) => (game.players[index] = player)

    beforeEach(() => {
        game.players.splice(0, game.players.length)
    })

    describe('incrementTurn', () => {
        it('should move the turn from player 0 to 1', () => {
            game.players.push({ isTurn: true, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'] })

            const result = incrementTurn(game)

            expect(result.players[0].isTurn).toEqual(false)
            expect(result.players[1].isTurn).toEqual(true)
            expect(result.players[2].isTurn).toEqual(false)
        })

        it('should move the turn to the first player when its on the last player (2 to 0)', () => {
            game.players.push({ isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: true, hand: ['KS', 'KD'] })

            const result = incrementTurn(game)

            expect(result.players[0].isTurn).toEqual(true)
            expect(result.players[1].isTurn).toEqual(false)
            expect(result.players[2].isTurn).toEqual(false)
        })

        it('should skip players who dont have a hand', () => {
            game.players.push({ isTurn: false })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: true, hand: ['KS', 'KD'] })

            const result = incrementTurn(game)

            expect(result.players[0].isTurn).toEqual(false)
            expect(result.players[1].isTurn).toEqual(true)
            expect(result.players[2].isTurn).toEqual(false)
        })
    })

    describe('incrementPhase', () => {
        it('should increment the phase itself', () => {
            game.phase = PREFLOP
            game.players.push({ isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'], isDealer: true })

            const result = incrementPhase(game)

            expect(result.phase).toEqual(FLOP)
        })

        it('should increment the phase itself when on the last phase', () => {
            game.phase = RIVER
            game.players.push({ isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'], isDealer: true })

            const result = incrementPhase(game)

            expect(result.phase).toEqual(PREFLOP)
        })

        it('should move the turn to the player after the dealer', () => {
            game.players.push({ isTurn: true, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'], isDealer: true })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'] })

            const result = incrementPhase(game)

            expect(result.players[0].isTurn).toEqual(false)
            expect(result.players[1].isTurn).toEqual(false)
            expect(result.players[2].isTurn).toEqual(true)
        })

        it('should move the turn to player after the dealer (2 to 0)', () => {
            game.players.push({ isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: true, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'], isDealer: true })

            const result = incrementPhase(game)

            expect(result.players[0].isTurn).toEqual(true)
            expect(result.players[1].isTurn).toEqual(false)
            expect(result.players[2].isTurn).toEqual(false)
        })

        it('should skip players who dont have a hand when moving turns', () => {
            game.players.push({ isTurn: false })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: true, hand: ['KH', 'KC'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'], isDealer: true })

            const result = incrementPhase(game)

            expect(result.players[0].isTurn).toEqual(false)
            expect(result.players[1].isTurn).toEqual(true)
            expect(result.players[2].isTurn).toEqual(false)
            expect(result.players[3].isTurn).toEqual(false)
        })

        it('should reset lastToRaiseId', () => {
            game.players.push({ isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'], isDealer: true })
            game.lastToRaiseId = 'FAKEID'

            const result = incrementPhase(game)

            expect(result.lastToRaiseId).toEqual(undefined)
        })
    })

    describe('handStrengths', () => {
        it('should have proper values', () => {
            expect(strengthValues.AL).toEqual(0.001)
            expect(strengthValues.TWO_PAIR).toEqual(1000000000000)
            expect(strengthValues.ROYAL_FLUSH).toEqual(1000000000000000000)
        })
    })

    describe('determineBetterHand', () => {
        it('should return false if it is a tie', () => {})

        it('Ace counts as a straight - Low', () => {})

        it('Ace counts as a straight - High', () => {})

        it('uses high card as tiebreaker', () => {})

        it('royal flush beats straight flush', () => {})

        it('straight flush beats quads', () => {})

        it('quads beats full house', () => {})

        it('full house beats flush', () => {})

        it('flush beats straight', () => {})

        it('straight beats set', () => {})

        it('set beats two pair', () => {})

        it('two pair beats one pair', () => {

        })

        it('two pair - high pair wins', () => {

        })

        it('two pair - second highest pair wins', () => {

        })

        it('two pair - kicker', () => {

        })

        it('two pair tie', () => {
            
        })

        it('high pair wins', () => {
            const hands = [
                ['AS', 'AC'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'AC'])
        })

        it('high pair wins - reverse', () => {
            const hands = [
                ['KS', 'KC'],
                ['AS', 'AC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'AC'])
        })

        it('high pair - kicker', () => {
            const hands = [
                ['AD', 'KC'],
                ['AS', 'QC']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AD', 'KC'])
        })

        it('one pair tie', () => {
            const hands = [
                ['AC', 'QC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })

        it('one pair beats high card', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['KS', 'KC'])
        })

        it('high card wins', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', '3S']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', '2S'])
        })

        it('high card - 4 ties in community', () => {
            const hands = [
                ['8S', '2S'],
                ['7S', '3S']
            ]
            const communityCards = ['AD', 'KD', 'JD', '10H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['8S', '2S'])
        })

        it('high card - tie in hand', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'QH']
            ]
            const communityCards = ['JD', '10D', '2D', '6H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'KS'])
        })

        it('no high card - tie', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'KC']
            ]
            const communityCards = ['JD', '10D', '2D', '6H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })
    })
})
