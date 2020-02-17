const { Game, validate } = require('../models/Game')
const { User } = require('../models/User')

const createGame = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to create a game.')
    }

    const { name, maxPlayers } = req.body

    const duplicateName = await Game.findOne({ name })
    if (duplicateName) {
        return res.status(400).send('The name of the game must be unique.')
    }

    let game = { players: [user], name, maxPlayers: parseInt(maxPlayers) }
    const { error } = validate(game)

    if (error) {
        return res.status(400).send(error)
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

    let game = await Game.findById(req.params.id).select('-players.hand')
    if (!game) {
        return res.status(404).send('Game not found.')
    }

    // Equals function is used to compare Mongoose ObjectIds.
    if (game.players.find(player => player._id === user._id)) {
        return res.status(400).send('User is already sitting at the table.')
    }

    if (game.players.length + 1 > game.maxPlayers) {
        return res.status(400).send('The table is already at max capacity.')
    }

    user.socketId = req.body.socketId
    game.players.push(user)

    // The players' games are updated inside of deal.
    if (game.players.length >= 2) {
        game = game.deal()
    }

    await game.save()

    return res.status(200).send()
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
        // TODO: look for syntax similar to .select('-players.hand')
        game = await game.save()

        // TODO: find better syntax for removing hands from the game
        game.players.forEach((player, index) => {
            game.players[index].hand = undefined
        })
        io.in(game._id).emit('gameUpdate', game)
    }

    return res.status(204).send()
}

module.exports = {
    createGame,
    getGame,
    getGames,
    joinTable,
    leaveTable
}
