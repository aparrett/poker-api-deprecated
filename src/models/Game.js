const mongoose = require('mongoose')
const Joi = require('joi')
const { cards, PREFLOP } = require('../constants')
const { encryptionSalt } = require('../config')
const CryptoJS = require('crypto-js')

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

    // Move dealer chip and set blinds.
    const dealerIndex = this.players.findIndex(player => player.isDealer)

    const numPlayers = this.players.length
    const nextDealerIndex = dealerIndex === -1 || dealerIndex === numPlayers - 1 ? 0 : dealerIndex + 1

    this.players.forEach((player, playerIndex) => {
        player.isTurn = false

        if (playerIndex === nextDealerIndex) {
            player.isDealer = true

            if (numPlayers === 2) {
                player.isSmallBlind = true
                player.isBigBlind = false
            }
        } else {
            player.isDealer = false

            if (numPlayers === 2) {
                player.isSmallBlind = false
                player.isBigBlind = true
            } else if (
                (nextDealerIndex === numPlayers - 1 && playerIndex === 0) ||
                playerIndex === nextDealerIndex + 1
            ) {
                player.isSmallBlind = true
                player.isBigBlind = false
            } else if (
                (nextDealerIndex === numPlayers - 2 && playerIndex === 0) ||
                (nextDealerIndex === numPlayers - 1 && playerIndex === 1) ||
                playerIndex === nextDealerIndex + 2
            ) {
                player.isSmallBlind = false
                player.isBigBlind = true
            } else {
                player.isSmallBlind = false
                player.isBigBlind = false
            }
        }

        const blind = player.isBigBlind ? this.bigBlind : player.isSmallBlind ? this.smallBlind : 0
        if (blind > 0) {
            let betAmount = 0
            if (player.chips < blind) {
                betAmount = player.chips
                player.chips = 0
            } else {
                betAmount = blind
                player.chips -= blind
            }
            this.bets.push({ playerId: player._id, username: player.username, amount: betAmount })
            this.pot += betAmount
        }

        this.players.set(playerIndex, player)
    })

    // Set first to act.
    const bigBlindIndex = this.players.findIndex(p => p.isBigBlind)
    const firstToActIndex = bigBlindIndex === numPlayers - 1 ? 0 : bigBlindIndex + 1
    const firstToAct = this.players[firstToActIndex]
    firstToAct.isTurn = true
    this.players.set(firstToActIndex, firstToAct)

    // Deal to connected players.
    connectedSockets.forEach(socketId => {
        const playerIndex = this.players.findIndex(player => player.socketId === socketId)
        const player = this.players[playerIndex]

        if (!player) {
            return
        }

        const card1 = chooseCard(usedCards)
        usedCards.push(card1)

        const card2 = chooseCard(usedCards)
        usedCards.push(card2)

        player.hand = [
            CryptoJS.AES.encrypt(card1, encryptionSalt).toString(),
            CryptoJS.AES.encrypt(card2, encryptionSalt).toString()
        ]

        this.players.set(playerIndex, player)
    })

    return this
}

const Game = mongoose.model('Game', gameSchema)

module.exports = {
    Game,
    validate
}
