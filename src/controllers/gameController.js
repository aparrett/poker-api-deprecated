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
    const game = await Game.findById(req.params.id)
    if (game) {
        return res.send(game)
    } else {
        return res.status(404).send('Game not found.')
    }
}

const getGames = async (req, res) => {
    const games = await Game.find()
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
    if (game.players.find(player => player._id.equals(user._id))) {
        return res.status(400).send('User is already sitting at the table.')
    }

    game.players.push(user)
    game = await game.save()
    return res.send(game.players)
}

module.exports = {
    createGame,
    getGame,
    getGames,
    joinTable
}
