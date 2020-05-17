const { incrementTurn, incrementPhase } = require('../src/service/gameService')
const { PREFLOP, FLOP, RIVER, DECK } = require('../src/constants')

const winnerService = require('../src/service/winnerService')
jest.mock('../src/service/winnerService')

winnerService.distributeChipsToWinners.mockImplementation(game => game)

describe('gameService', () => {
    const game = { players: [], communityCards: [], deck: DECK, playersWaiting: [], allInHands: [] }
    game.players.set = (index, player) => (game.players[index] = player)

    beforeEach(() => {
        game.players.splice(0, game.players.length)
        game.phase = PREFLOP
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

        it('should move the turn to player after the dealer (index 2 to 0)', () => {
            game.players.push({ isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ isTurn: true, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: false, hand: ['KS', 'KD'], isDealer: true })

            const result = incrementPhase(game)

            expect(result.players[0].isTurn).toEqual(true)
            expect(result.players[1].isTurn).toEqual(false)
            expect(result.players[2].isTurn).toEqual(false)
        })

        it('it should skip the next player when they are all in', () => {
            game.players.push({ isTurn: false, hand: ['TH', 'TC'], lastAction: 'All-In' })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: true, hand: ['KH', 'KC'] })
            game.players.push({ isTurn: false, isDealer: true, hand: ['JH', 'JC'] })

            const result = incrementPhase(game)

            expect(result.players[0].isTurn).toEqual(false)
            expect(result.players[1].isTurn).toEqual(true)
            expect(result.players[2].isTurn).toEqual(false)
            expect(result.players[3].isTurn).toEqual(false)
        })

        it('it should skip the next player when they dont have a hand', () => {
            game.players.push({ isTurn: false })
            game.players.push({ isTurn: false, hand: ['AH', 'AC'] })
            game.players.push({ isTurn: true, hand: ['KH', 'KC'] })
            game.players.push({ isTurn: false, isDealer: true, hand: ['JH', 'JC'] })

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

    describe('finishTurn', () => {
        it('pre-flop - should increment phase when big blind checks and they have the largest bet', () => {})
        it('pre-flop - should increment phase when all have called a raise', () => {})
        it('pre-flop - should increment phase when big blind raises and all have called', () => {})
        it('pre-flop - should increment turn when big blind calls and someone hasnt called yet', () => {})
        it('pre-flop - should increment turn when big blind raises and someone hasnt called yet', () => {})
        it('should increment turn when player checks and other players havent played', () => {})
        it('should increment turn when player raises', () => {})
        it('should increment turn when player calls and other players havent played yet', () => {})
        it('should increment phase when player folds, one player just went all-in, and other player has called', () => {})
        it('should increment turn when player folds, one player just went all-in, and other player has not called', () => {})
        it('should increment phase when player folds, one player already all-in', () => {})
        it('should increment phase when all players are all-in', () => {})
        it('should increment phase when last player folds and others have checked', () => {})
        it('should increment turn when two players are all-in and third hasnt played yet', () => {})
    })
})
