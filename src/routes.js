const { createUser, loginUser, getUser } = require('./controllers/userController')
const { createGame, getGame, getGames, joinTable, leaveTable } = require('./controllers/gameController')
const auth = require('./middleware/auth')

module.exports = function(app) {
    app.post('/users', createUser)
    app.post('/login', loginUser)
    app.get('/me', auth, getUser)

    app.post('/games/:id/players', auth, joinTable)
    app.delete('/games/:id/players', auth, leaveTable)
    app.get('/games/:id', getGame)
    app.post('/games', auth, createGame)
    app.get('/games', getGames)
}
