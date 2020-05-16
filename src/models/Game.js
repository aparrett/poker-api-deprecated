const mongoose = require('mongoose')
const Joi = require('joi')
const { PREFLOP } = require('../constants')

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
    },
    hand: {
        type: Array,
        required: false
    },
    maxBuyIn: {
        type: Number,
        required: true
    },
    bigBlind: {
        type: Number,
        required: true
    },
    smallBlind: {
        type: Number,
        required: true
    },
    bets: {
        type: Array,
        required: true,
        default: []
    },
    lastToRaiseId: {
        type: String,
        required: false
    },
    pot: {
        type: Number,
        required: true,
        default: 0
    },
    playersWaiting: {
        type: Array,
        required: true,
        default: []
    },
    phase: {
        type: String,
        required: true,
        default: PREFLOP
    },
    deck: {
        type: Array,
        required: true,
        default: []
    },
    communityCards: {
        type: Array,
        required: true,
        default: []
    },
    // storing all-in hands here so that they can always be unencrypted.
    allInHands: {
        type: Array,
        required: true,
        default: []
    }
})

function validate(game) {
    const schema = {
        name: Joi.string()
            .min(5)
            .max(25),
        maxPlayers: Joi.number()
            .integer()
            .min(0)
            .max(12)
            .required(),
        players: Joi.array().required(),
        maxBuyIn: Joi.number()
            .integer()
            .min(0)
            .required(),
        bigBlind: Joi.number()
            .integer()
            .min(0)
            .required(),
        smallBlind: Joi.number()
            .integer()
            .min(0)
            .max(game.bigBlind - 1)
            .required()
    }

    return Joi.validate(game, schema)
}

const Game = mongoose.model('Game', gameSchema)

module.exports = {
    Game,
    validate
}
