const { createUser, loginUser, getUser } = require('./controllers/userController')
const {
    createGame,
    getGame,
    getGames,
    userJoinTable,
    leaveTable,
    userMove,
    moveEnum
} = require('./controllers/gameController')
const auth = require('./middleware/auth')

module.exports = function (app) {
    app.post('/users', createUser)
    app.post('/login', loginUser)
    app.get('/me', auth, getUser)

    app.post('/games/:id/players', auth, userJoinTable)
    app.delete('/games/:id/players', auth, leaveTable)
    app.get('/games/:id', getGame)
    app.post('/games', auth, createGame)
    app.get('/games', getGames)

    app.post('/games/:id/call', auth, userMove(moveEnum.CALL))
    app.post('/games/:id/check', auth, userMove(moveEnum.CHECK))
    app.post('/games/:id/fold', auth, userMove(moveEnum.FOLD))
    app.post('/games/:id/raise', auth, userMove(moveEnum.RAISE))
}
