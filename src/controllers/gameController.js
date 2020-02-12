const { Game, validate } = require('../models/Game')
const { User } = require('../models/User')

const createGame = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        res.status(401).send('You must be logged in to create a game.')
    }

    const { name, maxPlayers } = req.body

    const duplicateName = await Game.findOne({ name })
    if (duplicateName) {
        res.status(400).send('The name of the game must be unique.')
    }

    let game = { players: [user], name, maxPlayers: parseInt(maxPlayers) }
    const { error } = validate(game)

    if (error) {
        res.status(400).send(error)
    }

    game = new Game(game) // creates a Mongoose object to save.
    game = await game.save() // returns the new object from Mongo with id.
    res.send(game)
}

const getGame = async (req, res) => {
    const game = await Game.findById(req.params.id)
    if (game) {
        res.send(game)
    } else {
        res.status(404).send('Game not found.')
    }
}

const getGames = async (req, res) => {
    const games = await Game.find()
    res.send(games)
}

module.exports = {
    createGame,
    getGame,
    getGames
}
