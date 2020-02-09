const { Game } = require('../models/Game')
const { User } = require('../models/User')

const createGame = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    let game = new Game({ players: [user] })
    game = await game.save()
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

module.exports = {
    createGame,
    getGame
}
