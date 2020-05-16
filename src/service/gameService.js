const { PREFLOP, FLOP, TURN, RIVER, phases, DECK } = require('../constants')
const { distributeChipsToWinners, getWinners } = require('./winnerService')
const { encryptCard, decryptHand } = require('./encryptionService')

const getLargestBet = game => {
    if (game.bets.length === 0) {
        return 0
    }
    return Math.max(...game.bets.map(bet => bet.amount))
}

const removeHand = player => {
    // A null hand means player has folded. Empty array means they have a hand, we just aren't
    // passing it to the UI so nobody even has encrypted hands of other players.
    // TODO: Find a cleaner solution.
    const hand = player.hand && []
    return { ...player, hand }
}

const updateAllUsers = game => {
    game = game.toObject()
    const connectedSockets = Object.keys(io.in(game._id).sockets)

    connectedSockets.forEach(socketId => {
        const player = game.players.find(player => player.socketId === socketId)

        let hand
        if (player && player.hand && player.hand.length > 0) {
            hand = decryptHand(player.hand)
        }

        io.to(socketId).emit('gameUpdate', { ...game, players: game.players.map(removeHand), hand, usedCards: [] })
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
    const newPhase = phases[nextPhaseIndex]
    game.phase = newPhase
    if (newPhase === PREFLOP) {
        game = finishRound(game)
        return game
    }

    const deck = game.deck.slice()
    if (newPhase === FLOP) {
        const flop = [deck.pop(), deck.pop(), deck.pop()]
        flop.forEach(card => {
            game.communityCards.push(card)
        })
    } else if (newPhase === TURN || newPhase === RIVER) {
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
    game.players.set(currentPlayerIndex, { ...game.players[currentPlayerIndex], isTurn: false })
    game.players.set(firstToActIndex, { ...game.players[firstToActIndex], isTurn: true })

    game.bets = []
    game = resetActions(game)

    return game
}

// resets actions in between phases.
const resetActions = game => {
    game.players.forEach((player, i) => {
        const lastAction = player.lastAction === 'Fold' ? 'Fold' : null
        game.players.set(i, { ...game.players[i], hasActed: false, lastAction })
    })

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
        player.isDealer = playerIndex === nextDealerIndex

        if (numPlayers === 2) {
            player.isSmallBlind = playerIndex === nextDealerIndex
            player.isBigBlind = playerIndex !== nextDealerIndex
        } else {
            player.isSmallBlind =
                (nextDealerIndex === numPlayers - 1 && playerIndex === 0) || playerIndex === nextDealerIndex + 1

            player.isBigBlind =
                (nextDealerIndex === numPlayers - 2 && playerIndex === 0) ||
                (nextDealerIndex === numPlayers - 1 && playerIndex === 1) ||
                playerIndex === nextDealerIndex + 2
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
    game = seatWaitingPlayers(game)
    if (game.players.length !== 1) {
        game = setDealerChipAndBlinds(game)
        game = setFirstToAct(game)
        game.deck = shuffleDeck()
        game = deal(game)
    }
    return game
}

const resetGame = game => {
    game.pot = 0
    game.lastToRaiseId = undefined
    game.bets = []
    game.deck = []
    game.communityCards = []
    game.phase = PREFLOP

    game.players.forEach((player, i) => {
        player.hasActed = false
        player.isTurn = false
        player.lastAction = null
        player.isBigBlind = false
        player.isSmallBlind = false
        player.hand = undefined
        game.players.set(i, player)
    })

    return game
}

const seatWaitingPlayers = game => {
    game.playersWaiting.forEach(player => game.players.push(player))
    game.playersWaiting = []
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
    shuffleDeck,
    resetGame,
    removeHand
}
