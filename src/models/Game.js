const mongoose = require('mongoose')
const Joi = require('joi')

const gameSchema = new mongoose.Schema({
    players: {
        type: Array,
        required: true
    },
    maxPlayers: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: false
    }
})

const Game = mongoose.model('Game', gameSchema)

function validate(user) {
    const schema = {
        name: Joi.string()
            .min(5)
            .max(25),
        maxPlayers: Joi.number()
            .integer()
            .min(0)
            .max(12)
            .required(),
        players: Joi.array().required()
    }

    return Joi.validate(user, schema)
}

exports.Game = Game
exports.validate = validate
