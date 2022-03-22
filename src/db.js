const mongoose = require('mongoose')
const config = require('./config')

module.exports = async () => {
    try {
        // These settings get rid of the deprecation warnings.
        const settings = {
            useUnifiedTopology: true,
            useNewUrlParser: true
        }
        await mongoose.connect(config.mongoURI, settings)
        console.info(`Connected to database.`)
    } catch (e) {
        console.error('Error connecting to database.', e)
    }
}
