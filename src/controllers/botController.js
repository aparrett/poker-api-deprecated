const io = require('socket.io-client');
const { botMove, moveEnum } = require('./gameController')

class BotPlayer {
	constructor(botName, botLevel, gameObj) {
		this._id = botName;
		this.username = botName;
		this.level = botLevel;
		this.game = gameObj;
		this.chips = 0;
		this.socketId = "";
	}

	initializeSocket = async () => {
		const socket = io();
		this.socketId = socket.id;

		try {
			socket.emit('joinGame', this.game._id, this);
			socket.on('gameUpdate', game => {
				if (game) {
					const nextDealer = game.players.find(p => p.isDealer)
					const previousDealer = this.game.players.find(p => p.isDealer)

					const dealerChanged = previousDealer && nextDealer && nextDealer._id !== previousDealer._id
					if (
						(this.game.players.length !== 1 && dealerChanged) ||
						(this.game.players.length > 1 && game.players.length === 1)
					) {
						// showWinners
						console.info(`[${this.username}] Winners of this round: ${game.winners}`);
					} else if (this.game.players.length === 1 && game.players.length > 1) {
						this.game = game
						// deal
						console.debug(`[${this.username}] next round is getting dealt`);
					} else {
						this.game = game
						this.checkTurnAndPlay();
					}
				} else {
					// closeGame
					console.warn(`[${this.username}] Bot has exitted the game with game-id: ${this.game._id}`);
				}
			})
		} catch (e) {
			// let errorText = "";
			// if (e.response.status === 404) {
			// 	errorText = 'Unable to find the specified game. Redirecting..'
			// } else {
			// 	errorText = 'Something went wrong, please try again later. Redirecting'
			// }

			console.warn(`[${this.username}] socket error: ${e}`);
		}
	}

	buyIn = () => {
		const buyInAmount = this.maxBuyIn; // basic buy in
		return buyInAmount
	}

	checkTurnAndPlay = async () => {
		const botPlayerIndex = this.game.players.findIndex(player => player._id.toString() === this._id.toString());
		const botPlayer = game.players[botPlayerIndex]

		if (botPlayer.isTurn) {
			console.log(`[${this.username}] turn to play`);
			this.playTurn();
		} else {
			console.debug(`[${this.username}] waiting for turn...`); // TODO: remove this console
		}
	}

	playTurn = async () => {
		/**
		 * Evaluation all available options
		 * Call Python code with list of options
		 * Return action
		 */

		// this stupid bot always folds!
		botMove(this, this.game._id, moveEnum.FOLD);
	}
}

module.exports = {
	BotPlayer
}