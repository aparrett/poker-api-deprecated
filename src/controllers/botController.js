const io = require('socket.io-client');
const MIN_WAIT_TIME_AT_START_MILLISECONDS = 5000;
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
		this.gameStartTS = null;
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
					if ((!previousDealer && nextDealer) || dealerChanged) {
						console.log(`[${this.username}] ====================== GAME START`);
						this.gameStartTS = new Date();
						this.playedOnceTS = false;
					}
					if (
						(this.game.players.length !== 1 && dealerChanged) ||
						(this.game.players.length > 1 && game.players.length === 1)
					) {
						// showWinners
						this.game = game;
						console.info(`[${this.username}] Winners of this round: ${JSON.stringify(game.winners)}`);
					} else if (this.game.players.length === 1 && game.players.length > 1) {
						this.game = game
						// deal
						console.debug(`[${this.username}] next round is getting dealt`);
					} else {
						if (this.checkTurn(this.game) && this.checkTurn(game) && this.playedOnceTS) {
							// repeated game state
							this.game = game;
							console.debug(`[${this.username}] my turn, but repeated situation`);
						}
						else {
							this.game = game
							this.checkTurnAndPlay(botMoveFunc, moveEnum);
						}
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
		const buyInAmount = this.game.maxBuyIn; // basic buy in
		return buyInAmount
	}

	checkTurn = (game) => {
		const botPlayerIndex = game.players.findIndex(player => player._id.toString() === this._id.toString());
		return (botPlayerIndex !== -1) && (game.players[botPlayerIndex].isTurn)
	}

	checkTurnAndPlay = async (botMoveFunc, moveEnum) => {
		const botPlayerIndex = this.game.players.findIndex(player => player._id.toString() === this._id.toString());
		if (botPlayerIndex == -1) {
			console.debug(`[${this.username}] not yet part of the game...`)
			return;
		}
		const botPlayer = this.game.players[botPlayerIndex]

		// if it is still my turn after a few seconds, retry action
		// if (new Date() - this.playedOnceTS > RETRY_DURATION_MILLISECONDS) {
		// 	this.playedOnceTS = false;
		// }

		if (botPlayer.isTurn) {
			if (!this.playedOnceTS) {
				console.debug(`[${this.username}] turn to play. playing...`)
				const timeLapsed = (new Date() - this.gameStartTS)
				if (MIN_WAIT_TIME_AT_START_MILLISECONDS > timeLapsed) {
					console.debug(`[${this.username}] waiting for ${(MIN_WAIT_TIME_AT_START_MILLISECONDS - timeLapsed) / 1000} seconds`)
					await new Promise(r => setTimeout(r, MIN_WAIT_TIME_AT_START_MILLISECONDS - timeLapsed));
				}
				console.log(`[${this.username}] time passed since game start: ${timeLapsed / 1000} seconds`)
				this.playTurn(botMoveFunc, moveEnum);
				this.playedOnceTS = new Date();
			}
			else {
				console.debug(`[${this.username}] turn to play. just played. Waiting for changes to reflect...`)
			}
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