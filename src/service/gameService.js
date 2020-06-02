const { PREFLOP, FLOP, TURN, RIVER, phases, DECK } = require('../constants')
const { distributeChipsToWinners, getHandRanks } = require('./winnerService')
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

    const activePlayers = game.players.filter(p => p.hand)
    // Only show allInHands when there are no more players betting.
    if (activePlayers.length !== game.allInHands.length) {
        game.allInHands = []
    }

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
    const largestBet = getLargestBet(game)

    const playersToAct = game.players.filter(p => p.hand && p.lastAction !== 'All-In')
    const playersWithLargestBet = playersToAct.filter(player => {
        const bet = game.bets.find(b => player._id.toString() === b.playerId.toString())
        return bet && bet.amount === largestBet
    })

    const allPlayersHaveLargestBet = playersWithLargestBet.length >= playersToAct.length
    const allPlayerHaveActed = !playersToAct.find(p => !p.lastAction)

    if ((game.lastToRaiseId && allPlayersHaveLargestBet) || (!game.lastToRaiseId && allPlayerHaveActed)) {
        game = incrementPhase(game)
    } else {
        game = incrementTurn(game)
    }

    return game
}

const incrementTurn = (game, startDealer = false) => {
    const playerToResetIndex = game.players.findIndex(p => p.isTurn)
    game.players.set(playerToResetIndex, { ...game.players[playerToResetIndex], isTurn: false })

    // when incrementing the phase, we start at the person left of the dealer because the dealer is last to act.
    const dealerIndex = game.players.findIndex(p => p.isDealer)
    const startingIndex = startDealer ? dealerIndex : playerToResetIndex

    let nextPlayerIndex = (startingIndex + 1) % game.players.length

    // If the next player doesn't have a hand or is all-in, skip them.
    while (!game.players[nextPlayerIndex].hand || game.players[nextPlayerIndex].lastAction === 'All-In') {
        nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length
    }

    game.players.set(nextPlayerIndex, { ...game.players[nextPlayerIndex], isTurn: true })

    return game
}

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

    game = reconcileAllIns(game)
    game = addSidePots(game)

    if (shouldAutoIncrementPhase(game)) {
        autoIncrementPhase(game)
    } else {
        game = incrementTurn(game, true)
    }

    game.bets = []
    game = resetActions(game)

    return game
}

const autoIncrementPhase = game => {
    // Since we are auto-incrementing phases there is no need for any player to have a turn.
    game.players.forEach(p => (p.isTurn = false))

    const timeToWait = game.phase === FLOP ? 4000 : 2250

    setTimeout(async () => {
        game = incrementPhase(game)
        await game.save()
        updateAllUsers(game)
    }, timeToWait)
}

// we need to auto-increment the phases when everyone is all-in.
const shouldAutoIncrementPhase = game => {
    const playersWithHands = game.players.filter(p => p.hand)
    return game.allInHands.length > 0 && playersWithHands.length === game.allInHands.length
}

const reconcileAllIns = game => {
    const allInCount = game.allInHands.length
    if (allInCount === 0) {
        return game
    }

    const playerCount = game.players.filter(p => p.hand).length

    // If there is one player remaining who is not all-in, put their hand in allInHands to show to everyone.
    if (allInCount === playerCount - 1) {
        const allInIds = game.allInHands.map(a => a.playerId)
        const playerIndex = game.players.findIndex(p => !allInIds.includes(p._id))
        const player = game.players[playerIndex]
        game.allInHands.push({ playerId: player._id, hand: decryptHand(player.hand) })
    } else if (allInCount === playerCount) {
        // If player with highest bet is all-in, subtract remaining total from the pot, and give it back to them.
        const bets = game.bets.slice()

        // If this function is called by the auto-increment, there won't be any bets
        // and we don't want to do this. (it will have already been done)
        if (bets.length !== 0) {
            bets.sort((a, b) => b.amount - a.amount)
            const highestBet = bets[0]
            const secondHighestBet = bets[1]

            const difference = highestBet.amount - secondHighestBet.amount
            if (difference) {
                const playerIndex = game.players.findIndex(p => p._id.toString() === highestBet.playerId.toString())
                const player = game.players[playerIndex]

                player.chips += difference
                game.players.set(playerIndex, player)

                game.pot -= difference
            }
        }
    }

    return game
}

const addSidePots = game => {
    if (game.bets.length === 0 || game.allInHands.length === 0 || game.players.filter(p => p.hand).length === 2) {
        return game
    }

    const totalBets = game.bets.reduce((acc, bet) => acc + bet.amount, 0)

    game.players
        .filter(p => p.lastAction === 'All-In')
        .forEach(p => {
            const existingSidePot = game.sidePots.find(sidePot => sidePot.playerId.toString() === p._id.toString())
            if (existingSidePot) {
                return
            }
            const playerBet = game.bets.find(b => b.playerId.toString() === p._id.toString()).amount
            const contributions = game.bets.reduce((acc, bet) => {
                const amount = playerBet > bet.amount ? bet.amount : playerBet
                return acc + amount
            }, 0)

            const amount = game.pot - totalBets + contributions
            game.sidePots.push({ playerId: p._id, amount })
        })

    return game
}

// resets actions in between phases.
const resetActions = game => {
    game.players.forEach((player, i) => {
        const lastAction = player.lastAction === 'Fold' || player.lastAction === 'All-In' ? player.lastAction : null
        game.players.set(i, { ...game.players[i], lastAction })
    })

    return game
}

const finishRound = (game, endedByFold) => {
    const winningHandOrder = getHandRanks(game)
    game = distributeChipsToWinners(game, winningHandOrder)
    game = removeBankruptPlayers(game)
    game.endedByFold = !!endedByFold
    game = startNextRound(game)
    return game
}

const removeBankruptPlayers = game => {
    game.players = game.players.filter(p => p.chips > 0)
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
    game.allInHands = []
    game.sidePots = []

    game.players.forEach((player, i) => {
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
    removeHand,
    reconcileAllIns,
    autoIncrementPhase,
    addSidePots
}
