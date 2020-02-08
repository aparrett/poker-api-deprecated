const { createUser } = require('./controllers/userController')

module.exports = function(app) {
    app.post('/users', createUser)
}
