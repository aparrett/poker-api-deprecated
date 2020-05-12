const { User, validate } = require('../models/User')
const bcrypt = require('bcrypt')

const createUser = async (req, res) => {
    const { error } = validate(req.body)
    if (error) {
        return res.status(400).send(error.details[0].message)
    }

    let user = await User.findOne({ username: req.body.username })
    if (user) {
        return res.status(400).send('A user is already registered with this username.')
    }

    const { name, username, password } = req.body
    user = new User({ name, username, password })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(user.password, salt)

    user.hand = null
    user = await user.save()

    const token = user.generateAuthToken()
    return res.send({ user: { name, username, _id: user.id }, token })
}

const loginUser = async (req, res) => {
    const user = await User.findOne({ username: req.body.username })
    if (!user) {
        return res.status(400).send('Invalid username or password.')
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password)
    if (!validPassword) {
        return res.status(400).send('Invalid username or password.')
    }

    const token = user.generateAuthToken()
    const { _id, name, username } = user
    return res.send({ token, user: { _id, name, username } })
}

const getUser = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(404).send('User not found.')
    }

    return res.send({ user })
}

module.exports = {
    createUser,
    loginUser,
    getUser
}
