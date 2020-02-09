const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema({
    players: {
        type: Array,
        required: true
    }
})

const Game = mongoose.model('Game', gameSchema)

exports.Game = Game
