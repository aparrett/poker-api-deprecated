const { PREFLOP, FLOP, TURN, RIVER, phases, DECK } = require('../constants')
const { distributeChipsToWinners, getWinners } = require('./winnerService')
const { encryptCard, decryptHand } = require('./encryptionService')

const getLargestBet = game => {
    if (game.bets.length === 0) {
        return 0
    }
    return Math.max(...game.bets.map(bet => bet.amount))
}

const updateAllUsers = game => {
    game = game.toObject()
    const playersWithoutHands = game.players.map(player => ({ ...player, hand: undefined }))
    const connectedSockets = Object.keys(io.in(game._id).sockets)

    connectedSockets.forEach(socketId => {
        const player = game.players.find(player => player.socketId === socketId)

        let hand
        if (player && player.hand && player.hand.length > 0) {
            hand = decryptHand(player.hand)
        }

        io.to(socketId).emit('gameUpdate', { ...game, players: playersWithoutHands, hand, usedCards: [] })
    })
}

const finishTurn = game => {
    const currentPlayerIndex = game.players.findIndex(p => p.isTurn)
    const currentPlayer = game.players[currentPlayerIndex]

    const largestBet = getLargestBet(game)
    const currentBetIndex = game.bets.findIndex(bet => bet.playerId.equals(currentPlayer._id))
    const currentBet = game.bets[currentBetIndex]

    if (
        game.phase === PREFLOP &&
        currentPlayer.isBigBlind &&
        currentBet &&
        currentBet.amount === largestBet &&
        !currentPlayer._id.equals(game.lastToRaiseId)
    ) {
        game = incrementPhase(game)
    } else {
        const allPlayersHaveLargestBet =
            game.players.filter(p => p.hand).length === game.bets.filter(b => b.amount === largestBet).length
        const allPlayerHaveActed = !game.players.find(p => p.hand && !p.hasActed)

        if ((game.lastToRaiseId && allPlayersHaveLargestBet) || (!game.lastToRaiseId && allPlayerHaveActed)) {
            game = incrementPhase(game)
        } else {
            game = incrementTurn(game)
        }
    }

    return game
}

const incrementTurn = game => {
    const currentPlayerIndex = game.players.findIndex(p => p.isTurn)
    let nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length

    // Players that have folded will not have a hand and should be skipped.
    while (!game.players[nextPlayerIndex].hand) {
        nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length
    }

    game.players.set(currentPlayerIndex, { ...game.players[currentPlayerIndex], isTurn: false })
    game.players.set(nextPlayerIndex, { ...game.players[nextPlayerIndex], isTurn: true })

    return game
}

// TODO: consider refactoring and combine shared code from incrementTurn
const incrementPhase = game => {
    const currentPhaseIndex = phases.findIndex(phase => phase === game.phase)
    const nextPhaseIndex = (currentPhaseIndex + 1) % phases.length

    game.phase = phases[nextPhaseIndex]
    if (game.phase === PREFLOP) {
        game = finishRound(game)
        return game
    }

    const deck = game.deck
    if (game.phase === FLOP) {
        const flop = [deck.pop(), deck.pop(), deck.pop()]
        flop.forEach(card => {
            game.communityCards.push(card)
        })
    } else if (game.phase === TURN || game.phase === RIVER) {
        game.communityCards.push(deck.pop())
    }
    game.deck = deck

    game.lastToRaiseId = undefined

    const dealerIndex = game.players.findIndex(p => p.isDealer)

    // Dealer is last to act.
    let firstToActIndex = (dealerIndex + 1) % game.players.length

    // If dealer has folded, continue to search for the next player who hasn't folded.
    while (!game.players[firstToActIndex].hand) {
        firstToActIndex = (firstToActIndex + 1) % game.players.length
    }

    const currentPlayerIndex = game.players.findIndex(p => p.isTurn)
    game.players.set(currentPlayerIndex, { ...game.players[currentPlayerIndex], isTurn: false, hasActed: false })
    game.players.set(firstToActIndex, { ...game.players[firstToActIndex], isTurn: true, hasActed: false })

    // TODO: add tests for this
    game.players.forEach((player, i) => {
        if (player.hand && ![currentPlayerIndex, firstToActIndex].includes(i)) {
            game.players.set(i, { ...game.players[i], hasActed: false })
        }
    })

    game.bets = []

    return game
}

const finishRound = game => {
    const winners = getWinners(game)
    game = distributeChipsToWinners(game, winners)
    game = startNextRound(game)
    return game
}

const setDealerChipAndBlinds = game => {
    const dealerIndex = game.players.findIndex(player => player.isDealer)

    const numPlayers = game.players.length
    const nextDealerIndex = dealerIndex === -1 || dealerIndex === numPlayers - 1 ? 0 : dealerIndex + 1

    game.players.forEach((player, playerIndex) => {
        player.isTurn = false

        if (playerIndex === nextDealerIndex) {
            player.isDealer = true

            if (numPlayers === 2) {
                player.isSmallBlind = true
                player.isBigBlind = false
            }
        } else {
            player.isDealer = false

            if (numPlayers === 2) {
                player.isSmallBlind = false
                player.isBigBlind = true
            } else if (
                (nextDealerIndex === numPlayers - 1 && playerIndex === 0) ||
                playerIndex === nextDealerIndex + 1
            ) {
                player.isSmallBlind = true
                player.isBigBlind = false
            } else if (
                (nextDealerIndex === numPlayers - 2 && playerIndex === 0) ||
                (nextDealerIndex === numPlayers - 1 && playerIndex === 1) ||
                playerIndex === nextDealerIndex + 2
            ) {
                player.isSmallBlind = false
                player.isBigBlind = true
            } else {
                player.isSmallBlind = false
                player.isBigBlind = false
            }
        }

        const blind = player.isBigBlind ? game.bigBlind : player.isSmallBlind ? game.smallBlind : 0
        if (blind > 0) {
            let betAmount = 0
            if (player.chips < blind) {
                betAmount = player.chips
                player.chips = 0
            } else {
                betAmount = blind
                player.chips -= blind
            }
            game.bets.push({ playerId: player._id, username: player.username, amount: betAmount })
            game.pot += betAmount
        }

        game.players.set(playerIndex, player)
    })

    return game
}

const setFirstToAct = game => {
    const bigBlindIndex = game.players.findIndex(p => p.isBigBlind)
    const firstToActIndex = bigBlindIndex === game.players.length - 1 ? 0 : bigBlindIndex + 1
    const firstToAct = game.players[firstToActIndex]
    firstToAct.isTurn = true
    game.players.set(firstToActIndex, firstToAct)
    return game
}

const shuffleDeck = () => {
    const deck = DECK.slice()
    let count = deck.length
    while (count) {
        deck.push(deck.splice(Math.floor(Math.random() * count), 1)[0])
        count -= 1
    }
    return deck
}

const deal = game => {
    const deck = game.deck
    game.players.forEach((player, index) => {
        const card1 = deck.pop()
        const card2 = deck.pop()

        player.hand = [encryptCard(card1), encryptCard(card2)]

        game.players.set(index, player)
    })
    game.deck = deck
    return game
}

const startNextRound = game => {
    game = resetGame(game)
    game = setDealerChipAndBlinds(game)
    game = setFirstToAct(game)
    game.deck = shuffleDeck()
    game = deal(game)

    return game
}

const resetGame = game => {
    game.pot = 0
    game.lastToRaiseId = undefined
    game.bets = []
    game.usedCards = []
    game.communityCards = []

    game.players.forEach((player, i) => {
        player.hasActed = false
        player.isTurn = false
        player.hand = undefined
        game.players.set(i, player)
    })

    return game
}

module.exports = {
    getLargestBet,
    updateAllUsers,
    finishTurn,
    incrementPhase,
    incrementTurn,
    finishRound,
    deal,
    startNextRound,
    shuffleDeck
}
