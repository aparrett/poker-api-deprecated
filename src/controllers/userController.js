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
    user = await user.save()

    const token = user.generateAuthToken()
    res.send({ user: { name, username, id: user.id }, token })
}

module.exports = {
    createUser
}
