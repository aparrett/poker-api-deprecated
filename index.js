const express = require('express')
const compression = require('compression')
const cors = require('cors')
const app = express()
const { initIo } = require('./src/io')

app.use(express.json())
app.use(compression())
app.use(cors())

require('./src/db')()
require('./src/routes')(app)

const port = process.env.PORT || 8081
const server = app.listen(port)
console.info(`Application started. Listening on port ${port}`)

const io = require('socket.io').listen(server)
global.io = io // allow sockets to be used in other files.
initIo(io)
