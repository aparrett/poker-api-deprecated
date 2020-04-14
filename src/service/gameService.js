const CryptoJS = require('crypto-js')
const { encryptionSalt } = require('../config')

const decryptHand = hand => [
    CryptoJS.AES.decrypt(hand[0], encryptionSalt).toString(CryptoJS.enc.Utf8),
    CryptoJS.AES.decrypt(hand[1], encryptionSalt).toString(CryptoJS.enc.Utf8)
]

const getLargestBet = game => Math.max(...game.bets.map(bet => bet.amount))

const updateAllUsers = game => {
    game = game.toObject()
    const playersWithoutHands = game.players.map(player => ({ ...player, hand: undefined }))
    const connectedSockets = Object.keys(io.in(game._id).sockets)

    connectedSockets.forEach(socketId => {
        game.hand = undefined

        const player = game.players.find(player => player.socketId === socketId)

        if (player) {
            game.hand = decryptHand(player.hand)
        }

        io.to(socketId).emit('gameUpdate', { ...game, players: playersWithoutHands })
    })
}

module.exports = {
    decryptHand,
    getLargestBet,
    updateAllUsers
}
