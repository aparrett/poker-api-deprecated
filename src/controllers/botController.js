const io = require('socket.io-client');
const RETRY_DURATION_MILLISECONDS = 2000;
class BotPlayer {
	constructor(botName, botLevel, gameObj) {
		this._id = botName;
		this.username = botName;
		this.name = botName;
		this.level = botLevel;
		this.game = gameObj;
		this.chips = 0;
		this.socketId = "";
		this.playedOnceTS = false;
	}

	initializeSocket = async (botMoveFunc, moveEnum) => {
		const socket = io('http://localhost:8081');

		try {
			socket.emit('joinGame', this.game._id, this);

			socket.on('connect', () => {
				console.debug(`[${this.username}] connect. socket-id: ${socket.id}`);
				this.socketId = socket.id;
			})

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
						console.info(`[${this.username}] Winners of this round: ${JSON.stringify(game.winners)}`);
					} else if (this.game.players.length === 1 && game.players.length > 1) {
						this.game = game
						// deal
						console.debug(`[${this.username}] next round is getting dealt`);
					} else {
						this.game = game
						this.checkTurnAndPlay(botMoveFunc, moveEnum);
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

	checkTurnAndPlay = async (botMoveFunc, moveEnum) => {
		const botPlayerIndex = this.game.players.findIndex(player => player._id.toString() === this._id.toString());
		if (botPlayerIndex == -1) {
			console.debug(`[${this.username}] not yet part of the game...`)
			return;
		}
		const botPlayer = this.game.players[botPlayerIndex]

		// if it is still my turn after a few seconds, retry action
		if (new Date() - this.playedOnceTS > RETRY_DURATION_MILLISECONDS) {
			this.playedOnceTS = false;
		}

		if (botPlayer.isTurn && !this.playedOnceTS) {
			console.debug(`[${this.username}] turn to play`);
			this.playTurn(botMoveFunc, moveEnum);
			this.playedOnceTS = new Date();
		} else {
			this.playedOnceTS = false;
			console.debug(`[${this.username}] waiting for turn...`); // TODO: remove this console
		}
	}

	playTurn = async (botMoveFunc, moveEnum) => {
		/**
		 * Evaluation all available options
		 * Call Python code with list of options
		 * Return action
		 */

		// this stupid bot always folds!
		botMoveFunc(this, this.game._id, moveEnum.FOLD);
	}
}

module.exports = {
	BotPlayer
}