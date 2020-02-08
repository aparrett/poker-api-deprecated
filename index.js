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
app.listen(port)
console.log(`Application started. Listening on port ${port}`)
