const { Game, validate } = require('../models/Game')
const { User } = require('../models/User')
const { BotPlayer } = require('./botController')
const assert = require('assert')
const {
    getLargestBet,
    updateAllUsers,
    finishTurn,
    finishRound,
    startNextRound,
    removeHand
} = require('../service/gameService')
const { decryptHand } = require('../service/encryptionService')

const createGame = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to create a game.')
    }

    const { name, maxPlayers, maxBuyIn, bigBlind, smallBlind, numBots, botLevel } = req.body

    const duplicateName = await Game.findOne({ name })
    if (duplicateName) {
        return res.status(400).send('The name of the game must be unique.')
    }

    user.chips = maxBuyIn

    let game = {
        players: [user],
        name,
        maxPlayers: parseInt(maxPlayers),
        maxBuyIn: parseInt(maxBuyIn),
        bigBlind: parseInt(bigBlind),
        smallBlind: parseInt(smallBlind),
        numBots: parseInt(numBots),
    }
    const { error } = validate(game)

    if (error) {
        return res.status(400).send(error.details[0].message)
    }

    game = new Game(game) // creates a Mongoose object to save.

    // create numBots bots of botLevel level
    let botPlayers = []
    const botGameObj = JSON.parse(JSON.stringify(game));
    botGameObj.players = botGameObj.players.map(p => removeHand(p));
    for (let i = 0; i < numBots; i++) {
        const botPlayer = new BotPlayer(`megabot_${i}`, botLevel, botGameObj);
        botPlayers.push(botPlayer);
    }

    game = await game.save() // returns the new object from Mongo with id.

    for (const botPlayer of botPlayers) {
        try {
            botJoinTable(botPlayer, game._id);
        } catch (e) {
            console.error(`[${botPlayer.username}] botJoinTable error: ${e}`);
        }
    }
    return res.send(game);
}

const getGame = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)

        if (game) {
            game.players = game.players.map(p => removeHand(p))
            return res.send(game)
        } else {
            return res.status(404).send('Game not found.')
        }
    } catch (e) {
        return res.status(404).send('Game not found.')
    }
}

const getGames = async (req, res) => {
    const games = await Game.find().select('-players.hand')
    return res.send(games)
}

const userJoinTable = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to join a table.')
    }

    const gameId = req.params.id;

    const { buyIn, socketId } = req.body;

    try {
        joinTable(user, gameId, buyIn, socketId);
        return res.status(200).send();
    } catch (e) {
        console.error(e);
        return res.status(500).send('Something went wrong.');
    }
}

const botJoinTable = async (botPlayer, gameId) => {
    await botPlayer.initializeSocket();
    buyIn = botPlayer.buyIn();

    joinTable(botPlayer, gameId, buyIn, botPlayer.socketId);
}

const joinTable = async (user, gameId, buyIn, socketId, res) => {
    const gameTxnSession = await Game.startSession();
    await gameTxnSession.withTransaction(async () => {
        let game = await Game.findById(gameId).session(gameTxnSession);
        if (!game) {
            return res.status(404).send('Game not found.')
        }

        if (game.players.find(player => player._id.toString() === user._id.toString())) {
            return res.status(400).send('User is already sitting at the table.')
        }

        if (game.playersWaiting.find(player => player._id.toString() === user._id.toString())) {
            return res.status(400).send('You will be dealt cards on the next hand.')
        }

        if (game.players.length + game.playersWaiting.length === game.maxPlayers) {
            return res.status(400).send('The table is already at max capacity.')
        }

        if (buyIn > game.maxBuyIn) {
            return res.status(400).send('The buy-in amount cannot be more than the max buy-in.')
        }

        if (buyIn <= game.bigBlind) {
            return res.status(400).send('The buy-in amount must greater than the big blind.')
        }

        user.socketId = socketId
        user.chips = buyIn

        if (parseInt(game.numBots) == 0) {
            if (game.players.length === 1) {
                game.players.push(user)
                game = startNextRound(game)
            } else {
                game.playersWaiting.push(user)
            }
        } else {
            const humanPlayersCount = game.players.length - parseInt(game.numBots);
            if (humanPlayersCount < 0) {
                // this is required to make sure that all bots are able to join the game
                game.players.push(user);
            } else if (humanPlayersCount == 0) {
                game.players.push(user);
                game = startNextRound(game);
            } else {
                game.playersWaiting.push(user);
            }
        }

        game = await game.save()
        updateAllUsers(game)
        console.log(`[${user.username}] socketId: ${socketId}, number of players in game: ${game.players.length}`);
        console.log(`[${user.username}] players in the game ${game.players.map(p => p.username)}`);
    });

    gameTxnSession.endSession();
    return
}

const leaveTable = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to leave a table.')
    }

    let returnObj;
    const gameTxnSession = await Game.startSession();
    await gameTxnSession.withTransaction(async () => {
        let game = await Game.findById(req.params.id).session(gameTxnSession);
        if (!game) {
            returnObj = res.status(404).send('Game not found.')
        }

        const index = game.players.findIndex(player => player._id.toString() === user._id.toString())
        if (index === -1) {
            const waitingIndex = game.playersWaiting.findIndex(player => player._id.toString() === user._id.toString())
            if (waitingIndex !== -1) {
                game.playersWaiting.splice(waitingIndex, 1)

                game = await game.save()
                updateAllUsers(game)
                returnObj = res.status(200).send();
                return;
            }
            returnObj = res.status(400).send('The requested user is not sitting at the table.');
            return;
        }

        if (game.players.length - game.numBots <= 1) {
            await Game.deleteOne({ _id: req.params.id }).session(gameTxnSession);

            // Any empty game object as the 2nd emit parameter informs clients that the game has been deleted.
            returnObj = io.in(game._id).emit('gameUpdate');
            return;
        }

        const player = game.players[index]

        if (player.isTurn) {
            game = finishTurn(game)
        }

        game.players.splice(index, 1)

        const leaverBetIndex = game.bets.findIndex(bet => bet.playerId === player._id)
        if (leaverBetIndex !== -1) {
            game.bets.splice(leaverBetIndex, 1)
        }

        // If there's only one player remaining with a hand, give them any bets and reset the player.
        if (game.players.filter(p => p.hand).length === 1) {
            game = finishRound(game, true)
        } else {
            if ([...new Set(game.bets.map(b => b.amount))].length > 0) {
                let max = 0
                game.bets.forEach(bet => {
                    if (bet.amount > max) {
                        game.lastToRaiseId = bet.playerId
                        max = bet.amount
                    }
                })
            }
        }

        try {
            game = await game.save()
            updateAllUsers(game)
            returnObj = res.status(200).send();
            return;
        } catch (e) {
            console.error(e);
            returnObj = res.status(500).send('Something went wrong.');
            return;
        }
    })

    gameTxnSession.endSession();
    return returnObj;
}

const call = async (user, gameId) => {
    let returnObj;
    const gameTxnSession = await Game.startSession();
    await gameTxnSession.withTransaction(async () => {
        let game = await Game.findById(gameId).session(gameTxnSession);
        if (!game) {
            returnObj = [404, 'Game not found.'];
            return;
        }

        if (user._id === game.lastToRaiseId) {
            returnObj = [400, 'Cannot call your own raise.'];
            return;
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (!player.isTurn) {
            returnObj = [400, 'You cannot call out of turn.'];
            return;
        }

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.toString() === user._id.toString())
        const currentBet = game.bets[currentBetIndex]
        const amountToCall = currentBet ? largestBet - currentBet.amount : largestBet
        const betAmount = player.chips < amountToCall ? player.chips : amountToCall

        player.chips -= betAmount

        if (!player.chips) {
            player.lastAction = 'All-In'
            game.allInHands.push({ playerId: player._id, hand: decryptHand(player.hand) })
        } else {
            player.lastAction = 'Call'
        }

        game.players.set(playerIndex, player)

        if (currentBet) {
            currentBet.amount += betAmount
            game.bets.set(currentBetIndex, currentBet)
        } else {
            game.bets.push({ playerId: player._id, username: player.username, amount: betAmount })
        }

        game.pot += betAmount

        game = finishTurn(game)
        game = await game.save()

        updateAllUsers(game)
        returnObj = [200, null];
    })

    gameTxnSession.endSession();
    return returnObj;
}

const check = async (user, gameId) => {
    let returnObj;
    const gameTxnSession = await Game.startSession();
    await gameTxnSession.withTransaction(async () => {
        let game = await Game.findById(gameId).session(gameTxnSession);
        if (!game) {
            returnObj = [404, 'Game not found.'];
            return;
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (!player.isTurn) {
            returnObj = [400, 'You cannot check out of turn.'];
            return;
        }

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.toString() === user._id.toString())
        const currentBet = game.bets[currentBetIndex]

        if (largestBet !== 0 && (!currentBet || currentBet.amount !== largestBet)) {
            returnObj = [400, 'Cannot check when your bet does not equal the largest bet.']
            return;
        }

        player.lastAction = 'Check'
        game.players.set(playerIndex, player)

        game = finishTurn(game)
        game = await game.save()

        updateAllUsers(game)
        returnObj = [200, null];
    })

    gameTxnSession.endSession();
    return returnObj;
}

const fold = async (user, gameId) => {
    let returnObj;
    const gameTxnSession = await Game.startSession();
    await gameTxnSession.withTransaction(async () => {
        let game = await Game.findById(gameId).session(gameTxnSession);
        if (!game) {
            returnObj = [404, 'Game not found.'];
            return;
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (!player.isTurn) {
            returnObj = [400, 'You cannot fold out of turn.'];
            return;
        }

        if (!player.hand) {
            returnObj = [400, 'You cannot fold again.'];
            return;
        }

        player.lastAction = 'Fold'
        player.hand = undefined
        game.players.set(playerIndex, player)

        if (game.players.filter(player => player.hand).length === 1) {
            game = finishRound(game, true)
        } else {
            game = finishTurn(game)
        }

        game = await game.save()

        updateAllUsers(game)
        returnObj = [200, null];
    })

    gameTxnSession.endSession();
    return returnObj;
}

const raise = async (user, gameId, raiseAmount) => {
    let returnObj;
    const gameTxnSession = await Game.startSession();
    await gameTxnSession.withTransaction(async () => {
        let game = await Game.findById(gameId).session(gameTxnSession);
        if (!game) {
            returnObj = [404, 'Game not found.'];
            return;
        }

        const playerIndex = game.players.findIndex(player => player._id.toString() === user._id.toString())
        const player = game.players[playerIndex]

        if (player._id === game.lastToRaiseId) {
            returnObj = [400, 'Cannot raise again when you were the last player to raise.'];
            return;
        }

        const largestBet = getLargestBet(game)
        const currentBetIndex = game.bets.findIndex(bet => bet.playerId.toString() === user._id.toString())
        const currentBet = game.bets[currentBetIndex]
        const amountToCall = currentBet ? largestBet - currentBet.amount : largestBet
        const totalBet = amountToCall + raiseAmount

        if (player.chips < totalBet) {
            returnObj = [400, 'Cannot raise more chips than what you have left.'];
            return;
        }

        if (currentBet) {
            currentBet.amount += totalBet
            game.bets.set(currentBetIndex, currentBet)
        } else {
            game.bets.push({ playerId: player._id, username: player.username, amount: totalBet })
        }

        if (totalBet === player.chips) {
            game.allInHands.push({ playerId: player._id, hand: decryptHand(player.hand) })
            player.lastAction = 'All-In'
        } else {
            player.lastAction = 'Raise'
        }

        game.lastToRaiseId = player._id

        player.chips -= totalBet
        game.players.set(playerIndex, player)

        game.pot += totalBet

        game = finishTurn(game)
        game = await game.save()

        updateAllUsers(game)
        returnObj = [200, null]
    })

    gameTxnSession.endSession();
    return returnObj;
}

const moveEnum = Object.freeze({
    FOLD: 'fold',
    CHECK: 'check',
    CALL: 'call',
    RAISE: 'raise',
})

const moveToFuncMap = {
    'fold': fold,
    'check': check,
    'call': call,
    'raise': raise,
}

const botMove = async (botPlayer, gameId, move, raiseAmount = 0) => {
    assert(Object.values(moveEnum).includes(move));
    const moveFunc = moveToFuncMap[move];
    try {
        if (move == moveEnum.RAISE) {
            if (!raiseAmount || typeof raiseAmount !== 'number') {
                const errorMsg = 'Raise must be a number greater than 0.';
                console.error(errorMsg);
                return errorMsg;
            }
            const [_, payload] = await moveFunc(botPlayer, gameId, raiseAmount);
            if (payload) {
                console.error(payload);
            }
            return payload
        } else {
            const [_, payload] = await moveFunc(botPlayer, gameId);
            if (payload) {
                console.error(payload);
            }
            return payload
        }
    } catch (e) {
        console.error(e);
        return 'Something went wrong.';
    }
}

const userMove = (move) => async (req, res) => {
    assert(Object.values(moveEnum).includes(move));
    const moveFunc = moveToFuncMap[move];
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
        return res.status(401).send('You must be logged in to act.')
    }

    const gameId = req.params.id;

    try {
        if (move == moveEnum.RAISE) {
            const raiseAmount = Number(req.body.amount)
            if (!raiseAmount || typeof raiseAmount !== 'number') {
                return res.status(400).send('Raise must be a number greater than 0.')
            }
            const [statusCode, payload] = await moveFunc(user, gameId, raiseAmount);
            return res.status(statusCode).send(payload);
        } else {
            const [statusCode, payload] = await moveFunc(user, gameId);
            return res.status(statusCode).send(payload);
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send('Something went wrong.')
    }
}

module.exports = {
    createGame,
    getGame,
    getGames,
    userJoinTable,
    botJoinTable,
    leaveTable,
    userMove,
    moveEnum,
    botMove,
}
