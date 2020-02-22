const mongoose = require('mongoose')
const Joi = require('joi')
const { cards } = require('../constants')

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
    buyIn: {
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
        buyIn: Joi.number()
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

const chooseCard = usedCards => {
    let card = cards[randomIndex()]
    while (usedCards.includes(card)) {
        card = cards[randomIndex()]
    }
    return card
}

const randomIndex = () => Math.ceil(Math.random() * 51)

gameSchema.methods.deal = function() {
    const connectedSockets = Object.keys(io.in(this._id).sockets)
    const usedCards = []
    const hands = []

    // Deal to connected players.
    connectedSockets.forEach(socketId => {
        const playerIndex = this.players.findIndex(player => player.socketId === socketId)
        if (playerIndex !== -1) {
            const card1 = chooseCard(usedCards)
            usedCards.push(card1)

            const card2 = chooseCard(usedCards)
            usedCards.push(card2)

            this.hand = [card1, card2]

            hands[playerIndex] = [card1, card2]
            io.to(socketId).emit('gameUpdate', this)
        } else {
            this.hand = undefined
            io.to(socketId).emit('gameUpdate', this)
        }
    })

    this.hand = undefined

    // Set hands for backend calculation after sending game updates to prevent all
    // hands being sent to all users.
    hands.forEach((hand, i) => {
        const player = game.players[i]
        if (player) {
            player.hand = hand
            game.players.set(i, player)
        }
    })

    return this
}

const Game = mongoose.model('Game', gameSchema)

module.exports = {
    Game,
    validate
}
