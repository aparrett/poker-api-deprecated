const local = {
    mongoURI: 'mongodb://127.0.0.1:27017'
}

const prod = {
    mongoURI: process.env.mongoURI
}

module.exports = process.env.NODE_ENV === 'production' ? prod : local
