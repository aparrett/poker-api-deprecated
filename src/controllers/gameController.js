const { Game, validate } = require('../models/Game')
const { User } = require('../models/User')
const {
    getLargestBet,
    updateAllUsers,
    finishTurn,
    finishRound,
    startNextRound,
    removeHand
} = require('../service/gameService')
const { decryptHand } = require('../service/encryptionService')

const createGame = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to create a game.')
    }

    const { name, maxPlayers, maxBuyIn, bigBlind, smallBlind } = req.body

    const duplicateName = await Game.findOne({ name })
    if (duplicateName) {
        return res.status(400).send('The name of the game must be unique.')
    }

    user.chips = maxBuyIn

    let game = {
        players: [user],
        name,
        maxPlayers: parseInt(maxPlayers),
        maxBuyIn: parseInt(maxBuyIn),
        bigBlind: parseInt(bigBlind),
        smallBlind: parseInt(smallBlind)
    }
    const { error } = validate(game)

    if (error) {
        return res.status(400).send(error.details[0].message)
    }

    game = new Game(game) // creates a Mongoose object to save.
    game = await game.save() // returns the new object from Mongo with id.
    return res.send(game)
}

const getGame = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)

        if (game) {
            game.players = game.players.map(p => removeHand(p))
            return res.send(game)
        } else {
            return res.status(404).send('Game not found.')
        }
    } catch (e) {
        return res.status(404).send('Game not found.')
    }
}

const getGames = async (req, res) => {
    const games = await Game.find().select('-players.hand')
    return res.send(games)
}

const joinTable = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to join a table.')
    }

    let game = await Game.findById(req.params.id)
    if (!game) {
        return res.status(404).send('Game not found.')
    }

    if (game.players.find(player => player._id.toString() === user._id.toString())) {
        return res.status(400).send('User is already sitting at the table.')
    }

    if (game.playersWaiting.find(player => player._id.toString() === user._id.toString())) {
        return res.status(400).send('You will be dealt cards on the next hand.')
    }

    if (game.players.length + game.playersWaiting.length === game.maxPlayers) {
        return res.status(400).send('The table is already at max capacity.')
    }

    const { buyIn, socketId } = req.body

    if (buyIn > game.maxBuyIn) {
        return res.status(400).send('The buy-in amount cannot be more than the max buy-in.')
    }

    if (buyIn <= game.bigBlind) {
        return res.status(400).send('The buy-in amount must greater than the big blind.')
    }

    user.socketId = socketId
    user.chips = buyIn

    if (game.players.length === 1) {
        game.players.push(user)
        game = startNextRound(game)
    } else {
        game.playersWaiting.push(user)
    }

    try {
        game = await game.save()
        updateAllUsers(game)
        return res.status(200).send()
    } catch (e) {
        console.log(e)
        return res.status(500).send('Something went wrong.')
    }
}

const leaveTable = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to leave a table.')
    }

    let game = await Game.findById(req.params.id)
    if (!game) {
        return res.status(404).send('Game not found.')
    }

    const index = game.players.findIndex(player => player._id.toString() === user._id.toString())
    if (index === -1) {
        const waitingIndex = game.playersWaiting.findIndex(player => player._id.toString() === user._id.toString())
        if (waitingIndex !== -1) {
            game.playersWaiting.splice(waitingIndex, 1)

            game = await game.save()
            updateAllUsers(game)
            return res.status(200).send()
        }
        return res.status(400).send('The requested user is not sitting at the table.')
    }

    if (game.players.length === 1) {
        await Game.deleteOne({ _id: req.params.id })

        // Any empty game object as the 2nd emit parameter informs clients that the game has been deleted.
        return io.in(game._id).emit('gameUpdate')
    }

    const player = game.players[index]

    if (player.isTurn) {
        game = finishTurn(game)
    }

    game.players.splice(index, 1)

    const leaverBetIndex = game.bets.findIndex(bet => bet.playerId === player._id)
    if (leaverBetIndex !== -1) {
        game.bets.splice(leaverBetIndex, 1)
    }

    // If there's only one player remaining with a hand, give them any bets and reset the player.
    if (game.players.filter(p => p.hand).length === 1) {
        game = finishRound(game, true)
    } else {
        if ([...new Set(game.bets.map(b => b.amount))].length > 0) {
            let max = 0
            game.bets.forEach(bet => {
                if (bet.amount > max) {
                    game.lastToRaiseId = bet.playerId
                    max = bet.amount
                }
            })
        }
    }

    try {
        game = await game.save()
        updateAllUsers(game)
        return res.status(200).send()
    } catch (e) {
        console.log(e)
        return res.status(500).send('Something went wrong.')
    }
}

const call = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        if (!user) {
            return res.status(401).send('You must be logged in to act.')
        }

        let game = await Game.findById(req.params.id)
        if (!game) {
            return res.status(404).send('Game not found.')
        }

        if (user._id === game.lastToRaiseId) {
            return res.status(400).send('Cannot call your own raise.')
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (!player.isTurn) {
            return res.status(400).send('You cannot call out of turn.')
        }

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.toString() === user._id.toString())
        const currentBet = game.bets[currentBetIndex]
        const amountToCall = currentBet ? largestBet - currentBet.amount : largestBet
        const betAmount = player.chips < amountToCall ? player.chips : amountToCall

        player.chips -= betAmount

        if (!player.chips) {
            player.lastAction = 'All-In'
            game.allInHands.push({ playerId: player._id, hand: decryptHand(player.hand) })
        } else {
            player.lastAction = 'Call'
        }

        game.players.set(playerIndex, player)

        if (currentBet) {
            currentBet.amount += betAmount
            game.bets.set(currentBetIndex, currentBet)
        } else {
            game.bets.push({ playerId: player._id, username: player.username, amount: betAmount })
        }

        game.pot += betAmount

        game = finishTurn(game)
        game = await game.save()

        updateAllUsers(game)
        return res.status(200).send()
    } catch (e) {
        console.log(e)
        return res.status(500).send('Something went wrong.')
    }
}

const check = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        if (!user) {
            return res.status(401).send('You must be logged in to act.')
        }

        let game = await Game.findById(req.params.id)
        if (!game) {
            return res.status(404).send('Game not found.')
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (!player.isTurn) {
            return res.status(400).send('You cannot check out of turn.')
        }

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.toString() === user._id.toString())
        const currentBet = game.bets[currentBetIndex]

        if (largestBet !== 0 && (!currentBet || currentBet.amount !== largestBet)) {
            return res.status(400).send('Cannot check when your bet does not equal the largest bet.')
        }

        player.lastAction = 'Check'
        game.players.set(playerIndex, player)

        game = finishTurn(game)
        game = await game.save()

        updateAllUsers(game)
        return res.status(200).send()
    } catch (e) {
        console.log(e)
        return res.status(500).send('Something went wrong.')
    }
}

const fold = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        if (!user) {
            return res.status(401).send('You must be logged in to act.')
        }

        let game = await Game.findById(req.params.id)
        if (!game) {
            return res.status(404).send('Game not found.')
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (!player.isTurn) {
            return res.status(400).send('You cannot fold out of turn.')
        }

        if (!player.hand) {
            return res.status(400).send('You cannot fold again.')
        }

        player.lastAction = 'Fold'
        player.hand = undefined
        game.players.set(playerIndex, player)

        if (game.players.filter(player => player.hand).length === 1) {
            game = finishRound(game, true)
        } else {
            game = finishTurn(game)
        }

        game = await game.save()

        updateAllUsers(game)
        return res.status(200).send()
    } catch (e) {
        console.log(e)
        return res.status(500).send('Something went wrong.')
    }
}

const raise = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        if (!user) {
            return res.status(401).send('You must be logged in to act.')
        }

        let game = await Game.findById(req.params.id)
        if (!game) {
            return res.status(404).send('Game not found.')
        }

        const raiseAmount = Number(req.body.amount)
        if (!raiseAmount || typeof raiseAmount !== 'number') {
            return res.status(400).send('Raise must be a number greater than 0.')
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (player._id === game.lastToRaiseId) {
            return res.status(400).send('Cannot raise again when you were the last player to raise.')
        }

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.toString() === user._id.toString())
        const currentBet = game.bets[currentBetIndex]
        const amountToCall = currentBet ? largestBet - currentBet.amount : largestBet
        const totalBet = amountToCall + raiseAmount

        if (player.chips < totalBet) {
            return res.status(400).send('Cannot raise more chips than what you have left.')
        }

        if (currentBet) {
            currentBet.amount += totalBet
            game.bets.set(currentBetIndex, currentBet)
        } else {
            game.bets.push({ playerId: player._id, username: player.username, amount: totalBet })
        }

        if (totalBet === player.chips) {
            game.allInHands.push({ playerId: player._id, hand: decryptHand(player.hand) })
            player.lastAction = 'All-In'
        } else {
            player.lastAction = 'Raise'
        }

        game.lastToRaiseId = player._id

        player.chips -= totalBet
        game.players.set(playerIndex, player)

        game.pot += totalBet

        game = finishTurn(game)
        game = await game.save()

        updateAllUsers(game)
        return res.status(200).send()
    } catch (e) {
        console.log(e)
        return res.status(500).send('Something went wrong.')
    }
}

module.exports = {
    createGame,
    getGame,
    getGames,
    joinTable,
    leaveTable,
    call,
    check,
    fold,
    raise
}
