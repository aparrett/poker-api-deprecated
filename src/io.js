const { Game } = require('./models/Game')

const initIo = io => {
    io.on('connection', function(socket) {
        // joinGame fires when any user loads the game in their browser.
        socket.on('joinGame', async function(gameId, user) {
            socket.join(gameId)

            const game = await Game.findById(gameId)
            if (user) {
                const playerIndex = game.players.findIndex(player => player._id === user._id)

                // Associate player at the table with a socket id so we can later
                // send them their cards and only their cards.
                // This handles the case where the user loads the game in their browser
                // but they are already sitting at the table.
                if (playerIndex !== -1) {
                    game.players[playerIndex].socketId = socket.id
                    await game.save()
                }
            }
        })
    })
}

exports.initIo = initIo
