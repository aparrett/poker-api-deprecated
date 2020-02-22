const { Game } = require('./models/Game')

const initIo = io => {
    io.on('connection', function(socket) {
        // joinGame fires when any user loads the game in their browser.
        socket.on('joinGame', async function(gameId, user) {
            console.debug(`User joined game ${gameId}. User: ${user.username} Socket: ${socket.id}`)

            socket.join(gameId)

            const game = await Game.findById(gameId)
            if (user) {
                const playerIndex = game.players.findIndex(player => player._id.equals(user._id))

                // This handles the case where the user loads the game in their browser
                // but they are already sitting at the table.
                if (playerIndex !== -1) {
                    const player = game.players[playerIndex]
                    player.socketId = socket.id
                    game.players.set(playerIndex, player)
                    await game.save()

                    // Send the user their hand.
                    game.hand = player.hand
                    io.to(socket.id).emit('gameUpdate', game)
                }
            }
        })
    })
}

exports.initIo = initIo
