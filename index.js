const express = require('express')
const compression = require('compression')
const app = express()

app.use(express.json())
app.use(compression())

require('./src/db')()
require('./src/routes')(app)

const port = process.env.PORT || 8081
app.listen(port)
