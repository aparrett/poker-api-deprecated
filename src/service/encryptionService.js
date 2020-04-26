const CryptoJS = require('crypto-js')
const { encryptionSalt } = require('../config')

const encryptCard = card => CryptoJS.AES.encrypt(card, encryptionSalt).toString()

const decryptCard = card => CryptoJS.AES.decrypt(card, encryptionSalt).toString(CryptoJS.enc.Utf8)

const decryptHand = hand => [decryptCard(hand[0]), decryptCard(hand[1])]

module.exports = {
    encryptCard,
    decryptCard,
    decryptHand
}
