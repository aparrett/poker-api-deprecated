const { Game, validate } = require('../models/Game')
const { User } = require('../models/User')
const { getLargestBet, updateAllUsers, finishTurn, finishRound, startNextRound } = require('../service/gameService')

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
    const game = await Game.findById(req.params.id).select('-players.hand')
    if (game) {
        return res.send(game)
    } else {
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

    // Equals function is used to compare Mongoose ObjectIds.
    if ([...game.players, ...game.playersWaiting].find(player => player._id === user._id)) {
        return res.status(400).send('User is already sitting at the table.')
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

    const index = game.players.findIndex(player => player._id.equals(user._id))
    if (index === -1) {
        return res.status(400).send('The requested user is not sitting at the table.')
    }

    if (game.players.length === 1) {
        await Game.deleteOne({ _id: req.params.id })

        // Any empty game object as the 2nd emit parameter informs the client that the game has been deleted.
        io.in(game._id).emit('gameUpdate')
    } else {
        game.players.splice(index, 1)

        // If there's only one player remaining. Give them any bets and reset the player.
        if (game.players.length === 1) {
            const winner = game.players[0]
            winner.chips = winner.chips + game.bets.map(b => b.amount).reduce((accumulator, bet) => accumulator + bet)
            winner.hand = undefined
            winner.isBigBlind = false
            winner.isDealer = false
            winner.isSmallBlind = false

            game.players.set(0, winner)
            game.bets = []

            // TODO: Give the winner the pot
            game.pot = 0
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

    return res.status(204).send()
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

        const playerIndex = game.players.findIndex(player => player._id.equals(user._id))
        const player = game.players[playerIndex]
        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.equals(user._id))
        const currentBet = game.bets[currentBetIndex]
        const amountToCall = currentBet ? largestBet - currentBet.amount : largestBet
        const betAmount = player.chips < amountToCall ? player.chips : amountToCall

        player.chips -= betAmount
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

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.equals(user._id))
        const currentBet = game.bets[currentBetIndex].amount

        if (currentBet !== largestBet) {
            return res.status(400).send('Cannot check when your bet does not equal the largest bet.')
        }

        const playerIndex = game.players.findIndex(player => player._id.equals(user._id))
        const player = game.players[playerIndex]
        player.hasActed = true
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

        const playerIndex = game.players.findIndex(player => player._id.equals(user._id))
        const player = game.players[playerIndex]

        if (!player.hand) {
            return res.status(400).send('You cannot fold again.')
        }

        player.hand = undefined
        game.players.set(playerIndex, player)

        if (game.players.filter(player => player.hand).length === 1) {
            game = finishRound(game)
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

module.exports = {
    createGame,
    getGame,
    getGames,
    joinTable,
    leaveTable,
    call,
    check,
    fold
}
