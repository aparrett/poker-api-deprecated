const express = require('express')
const compression = require('compression')
const cors = require('cors')
const app = express()

app.use(express.json())
app.use(compression())
app.use(cors())

require('./src/db')()
require('./src/routes')(app)

const port = process.env.PORT || 8081
const server = app.listen(port)
console.log(`Application started. Listening on port ${port}`)

const io = require('socket.io').listen(server)
global.io = io // allow sockets to be used in other files.
io.on('connection', function(socket) {
    socket.on('join', function(gameId) {
        socket.join(gameId)
    })
})
