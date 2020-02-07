module.exports = function(app) {
    app.get('/users/1', (req, res) => {
        res.send({ firstName: 'Test', lastName: 'User' })
    })
}
