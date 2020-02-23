const local = {
    mongoURI: 'mongodb://127.0.0.1:27017/poker-db',
    jwtPrivateKey: 'z&234!jsh9,',
    encryptionSalt: 'encryptionSalt'
}

const prod = {
    mongoURI: process.env.mongoURI,
    jwtPrivateKey: process.env.jwtPrivateKey,
    encryptionSalt: process.env.encryptionSalt
}

module.exports = process.env.NODE_ENV === 'production' ? prod : local
