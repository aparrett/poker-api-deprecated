const config = require('../config')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 100
    },
    username: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    socketId: {
        type: String,
        required: false
    },
    hand: {
        type: Array,
        required: false,
        default: null
    },
    chips: {
        type: Number,
        required: false
    },
    isTurn: {
        type: Boolean,
        required: false
    },
    isDealer: {
        type: Boolean,
        required: false
    },
    isBigBlind: {
        type: Boolean,
        required: false
    },
    isSmallBlind: {
        type: Boolean,
        required: false
    },
    lastAction: {
        type: String,
        required: false,
        default: null
    }
})

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, config.jwtPrivateKey)
    return token
}

const User = mongoose.model('User', userSchema)

function validate(user) {
    const schema = {
        name: Joi.string()
            .min(3)
            .max(100)
            .required(),
        username: Joi.string()
            .regex(/^megabot.*/, { invert: true })
            .min(5)
            .max(255)
            .required(),
        password: Joi.string()
            .min(5)
            .max(255)
            .required()
    }

    return Joi.validate(user, schema)
}

module.exports = {
    User,
    validate
}
