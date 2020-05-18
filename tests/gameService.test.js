const { incrementTurn, incrementPhase, finishTurn } = require('../src/service/gameService')
const { PREFLOP, FLOP, TURN, RIVER, DECK } = require('../src/constants')

const winnerService = require('../src/service/winnerService')
jest.mock('../src/service/winnerService')

winnerService.distributeChipsToWinners.mockImplementation(game => game)

describe('gameService', () => {
    let game

    beforeEach(() => {
        game = {
            phase: PREFLOP,
            players: [],
            communityCards: [],
            deck: DECK,
            playersWaiting: [],
            bets: [],
            allInHands: []
        }
        game.players.set = (index, player) => (game.players[index] = player)
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
        it('pre-flop - should increment phase when big blind checks and they have the largest bet', () => {
            game.players.push({ _id: 'bb', isTurn: true, isBigBlind: true, hand: ['AS', 'AD'], lastAction: 'Check' })
            game.players.push({
                _id: 'sb',
                isTurn: false,
                isSmallBlind: true,
                hand: ['KS', 'KD'],
                isDealer: true,
                lastAction: 'Call'
            })
            game.bets = [
                { playerId: 'bb', amount: 20 },
                { playerId: 'sb', amount: 20 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
        })

        it('pre-flop - should increment phase when all have called a raise', () => {
            game.players.push({ _id: 'bb', isTurn: true, isBigBlind: true, hand: ['AS', 'AD'], lastAction: 'Call' })
            game.players.push({
                _id: 'sb',
                isTurn: false,
                isSmallBlind: true,
                hand: ['KS', 'KD'],
                isDealer: true,
                lastAction: 'Raise'
            })
            game.lastToRaiseId = 'sb'
            game.bets = [
                { playerId: 'bb', amount: 30 },
                { playerId: 'sb', amount: 30 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
        })

        it('pre-flop - should increment phase when big blind raises and all have called', () => {
            game.players.push({ _id: 'bb', isTurn: true, isBigBlind: true, hand: ['AS', 'AD'], lastAction: 'Raise' })
            game.players.push({
                _id: 'sb',
                isTurn: false,
                isSmallBlind: true,
                hand: ['KS', 'KD'],
                isDealer: true,
                lastAction: 'Call'
            })
            game.lastToRaiseId = 'sb'
            game.bets = [
                { playerId: 'bb', amount: 30 },
                { playerId: 'sb', amount: 30 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
        })

        it('pre-flop - should increment turn when big blind calls and someone hasnt called yet', () => {
            game.players.push({
                _id: 'sb',
                isTurn: false,
                isSmallBlind: true,
                hand: ['KS', 'KD'],
                isDealer: true,
                lastAction: 'Raise'
            })
            game.players.push({ _id: 'bb', isTurn: true, isBigBlind: true, hand: ['AS', 'AD'], lastAction: 'Call' })
            game.players.push({ _id: 'p1', isTurn: false, hand: ['AS', 'AD'], lastAction: 'Call' })
            game.lastToRaiseId = 'sb'
            game.bets = [
                { playerId: 'bb', amount: 30 },
                { playerId: 'sb', amount: 30 },
                { playerId: 'p1', amount: 20 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(PREFLOP)
            expect(result.players.find(p => p._id === 'p1').isTurn).toEqual(true)
        })

        it('pre-flop - should increment turn when big blind raises and someone hasnt called yet', () => {
            game.players.push({
                _id: 'sb',
                isTurn: false,
                isSmallBlind: true,
                hand: ['KS', 'KD'],
                isDealer: true,
                lastAction: 'Call'
            })
            game.players.push({ _id: 'bb', isTurn: false, isBigBlind: true, hand: ['AS', 'AD'], lastAction: 'Raise' })
            game.players.push({ _id: 'p1', isTurn: true, hand: ['AS', 'AD'], lastAction: 'Call' })
            game.lastToRaiseId = 'bb'
            game.bets = [
                { playerId: 'sb', amount: 20 },
                { playerId: 'bb', amount: 30 },
                { playerId: 'p1', amount: 30 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(PREFLOP)
            expect(result.players.find(p => p._id === 'sb').isTurn).toEqual(true)
        })

        it('should increment turn when player checks and other players havent played', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: false, hand: ['KS', 'KD'] })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ _id: 'p3', isTurn: true, hand: ['AS', 'AD'], lastAction: 'Check' })

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
            expect(result.players.find(p => p._id === 'p1').isTurn).toEqual(true)
        })

        it('should increment turn when player raises', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: false, hand: ['KS', 'KD'] })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ _id: 'p3', isTurn: true, hand: ['AS', 'AD'], lastAction: 'Raise' })
            game.bets = [{ playerId: 'p3', amount: 30 }]

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
            expect(result.players.find(p => p._id === 'p1').isTurn).toEqual(true)
        })

        it('should increment turn when player calls and other players havent played yet', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: true, hand: ['KS', 'KD'], lastAction: 'Call' })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'] })
            game.players.push({ _id: 'p3', isTurn: false, hand: ['AS', 'AD'], lastAction: 'Raise' })
            game.bets = [
                { playerId: 'p3', amount: 30 },
                { playerId: 'p1', amount: 30 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
            expect(result.players.find(p => p._id === 'p2').isTurn).toEqual(true)
        })

        it('should increment phase when player folds, one player just went all-in, and other player has called', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: true, lastAction: 'Fold' })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'], lastAction: 'All-In' })
            game.players.push({ _id: 'p3', isTurn: false, hand: ['AS', 'AD'], lastAction: 'Call' })
            game.lastToRaiseId = 'p2'
            game.bets = [
                { playerId: 'p2', amount: 30 },
                { playerId: 'p3', amount: 30 }
            ]

            const result = finishTurn(game)
            expect(result.phase).toEqual(TURN)
        })

        it('should increment turn when player folds, one player just went all-in, and other player has not called', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: false, hand: ['KS', 'KD'], lastAction: 'Check' })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'], lastAction: 'All-In' })
            game.players.push({ _id: 'p3', isTurn: true, lastAction: 'Fold' })
            game.allInHands.push(['AS', 'AD'])

            game.lastToRaiseId = 'p2'
            game.bets = [{ playerId: 'p2', amount: 30 }]

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
            expect(result.players.find(p => p._id === 'p1').isTurn).toEqual(true)
        })

        it('should increment phase when player folds, other two are all-in', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: true, lastAction: 'Fold' })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'], lastAction: 'All-In' })
            game.players.push({ _id: 'p3', isTurn: false, hand: ['AC', 'AH'], lastAction: 'All-In' })
            game.lastToRaiseId = 'p3'
            game.bets = [
                { playerId: 'p2', amount: 30 },
                { playerId: 'p3', amount: 50 }
            ]
            game.allInHands.push(['AC', 'AH'])
            game.allInHands.push(['AS', 'AD'])

            const result = finishTurn(game)
            expect(result.phase).toEqual(TURN)
        })

        it('should increment phase when all players are all-in', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: true, hand: ['KS', 'KD'], lastAction: 'All-In' })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'], lastAction: 'All-In' })
            game.players.push({ _id: 'p3', isTurn: false, hand: ['AC', 'AH'], lastAction: 'All-In' })
            game.lastToRaiseId = 'p3'
            game.bets = [
                { playerId: 'p1', amount: 30 },
                { playerId: 'p2', amount: 30 },
                { playerId: 'p3', amount: 50 }
            ]
            game.allInHands.push(['AS', 'AD'])
            game.allInHands.push(['AC', 'AH'])
            game.allInHands.push(['KC', 'KH'])

            const result = finishTurn(game)
            expect(result.phase).toEqual(TURN)
        })

        it('should increment phase when last player folds and others have checked', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: true, lastAction: 'Fold' })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'], lastAction: 'Check' })
            game.players.push({ _id: 'p3', isTurn: false, hand: ['AC', 'AH'], lastAction: 'Check' })

            const result = finishTurn(game)
            expect(result.phase).toEqual(TURN)
        })

        it('should increment turn when two players are all-in and third hasnt played yet', () => {
            game.phase = FLOP
            game.players.push({ _id: 'p1', isTurn: false, hand: ['KS', 'JD'] })
            game.players.push({ _id: 'p2', isTurn: false, hand: ['AS', 'AD'], lastAction: 'All-In' })
            game.players.push({ _id: 'p3', isTurn: true, hand: ['AC', 'AH'], lastAction: 'All-In' })
            game.lastToRaiseId = 'p3'
            game.bets = [
                { playerId: 'p2', amount: 30 },
                { playerId: 'p3', amount: 50 }
            ]
            game.allInHands.push(['AC', 'AH'])
            game.allInHands.push(['AS', 'AD'])

            const result = finishTurn(game)
            expect(result.phase).toEqual(FLOP)
            expect(result.players.find(p => p._id === 'p1').isTurn).toEqual(true)
        })
    })
})
