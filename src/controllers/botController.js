const io = require('socket.io-client');
const MIN_WAIT_TIME_AT_START_MILLISECONDS = 4000;
const PLAY_DELAY_MILLISECONDS = 2000;

// this needs to be in sync with GameSettingsDialog.vue in the client code
const botLevelOptions = Object.freeze({
	EASY: 'Easy',
	MEDIUM: 'Medium',
	HARD: 'Hard'
})

class BotPlayer {
	constructor(botName, botLevel, gameObj) {
		this._id = botName;
		this.username = botName;
		this.name = botName;
		this.level = botLevel;
		this.game = gameObj;
		this.chips = 0;
		this.socketId = "";
		this.hand = [];
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
						this.hand = [];
						this.gameStartTS = new Date();
						this.playedOnceTS = false;
					}
					else if (game.phase != this.game.phase) {
						// it is possible that the last mover of the previous phase is the first mover of the next phase
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
							if (this.game.hand) this.hand = this.game.hand;
							console.debug(`[${this.username}] my turn, but repeated situation`);
						}
						else {
							this.game = game
							if (this.game.hand) this.hand = this.game.hand;
							this.checkTurnAndPlay(botMoveFunc, moveEnum);
						}
					}
				} else {
					// closeGame
					console.warn(`[${this.username}] Bot has exitted the game with game-id: ${this.game._id}`);
				}
			})
		} catch (e) {
			console.warn(`[${this.username}] socket error: ${e}`);
		}
	}

	buyIn = () => {
		const buyInAmount = this.game.maxBuyIn; // basic buy in
		return buyInAmount
	}


	botPlayer = (game) => (game.players.find(player => player._id === this._id))

	isBotPlaying = (game) => !!this.botPlayer(game)

	checkTurn = (game) => (this.isBotPlaying(game) && this.botPlayer(game).isTurn)

	playerBet(game) {
		if (!this.isBotPlaying(game)) {
			return false
		}
		const bet = game.bets.find(b => b.playerId === this._id)
		return bet ? bet.amount : false
	}

	largestBet(game) {
		if (!game || game.bets.length === 0) {
			return 0
		}
		return Math.max(...game.bets.map(bet => bet.amount))
	}

	canCall = (game) => (
		(game.bets.length > 0) && (this.playerBet(game) !== this.largestBet(game))
	)

	canCheck(game) {
		const playerBet = this.playerBet(game);
		if (
			(!playerBet && game.bets.length > 0) ||
			(playerBet && playerBet < this.largestBet(game))
		) {
			return false
		}
		return true
	}

	amountToCall(game) {
		const playerBet = this.playerBet(game) || 0;
		return this.largestBet(game) - playerBet;
	}

	canRaise(game) {
		if (!this.isBotPlaying(game)) {
			return false
		}
		const amountToCall = this.amountToCall(game);
		return this.botPlayer(game).chips > amountToCall && game.lastToRaiseId !== this._id
	}

	checkTurnAndPlay = async (botMoveFunc, moveEnum) => {
		if (!this.isBotPlaying(this.game)) {
			// console.debug(`[${this.username}] not yet part of the game...`)
			return;
		}
		const botPlayer = this.botPlayer(this.game);
		if (botPlayer.isTurn) {
			if (!this.playedOnceTS) {
				console.debug(`[${this.username}] turn to play. playing...`)
				if (this.hand && this.hand.length > 0) {
					this.playedOnceTS = new Date(); // play finalized

					const timeLapsed = (new Date() - this.gameStartTS);
					const playDelayMS = Math.max(PLAY_DELAY_MILLISECONDS, MIN_WAIT_TIME_AT_START_MILLISECONDS - timeLapsed)
					console.debug(`[${this.username}] waiting for ${playDelayMS / 1000} seconds`)
					setTimeout(this.playTurn, playDelayMS, botMoveFunc, moveEnum);
				} else {
					console.warn(`[${this.username}] Did not receive hand details. Waiting...`)
				}
			}
			else {
				console.debug(`[${this.username}] turn to play. just played. Waiting for changes to reflect...`)
			}
		} else {
			this.playedOnceTS = false;
			console.debug(`[${this.username}] waiting for turn...`); // TODO: remove this console
		}
	}

	localPlayLogic = (game, hand, playOptions, moveEnum) => {
		const moveDetails = (move, raiseAmount = 0) => ({
			move, raiseAmount
		})
		switch (this.level) {
			case botLevelOptions.EASY:
				// this stupid bot always folds!
				return moveDetails(moveEnum.FOLD);
			case botLevelOptions.MEDIUM:
				const moveIndex = Math.floor(Math.random() * playOptions.length);
				const move = playOptions[moveIndex];
				if (move != moveEnum.RAISE) {
					return moveDetails(move);
				} else {
					// when we want to raise
					const raiseLimit = this.botPlayer(this.game).chips - this.amountToCall(this.game);
					const raiseAmount = Math.ceil(Math.random() * raiseLimit);
					return moveDetails(move, raiseAmount);
				}
			case botLevelOptions.HARD:
				if (!hand || hand.length == 0) {
					return moveDetails(moveEnum.FOLD); // folds if no information is available
				}
				const playInPriorityOrder = (order) => {
					for (let move of order) {
						if (playOptions.includes(move)) {
							if (move != moveEnum.RAISE) {
								return moveDetails(move);
							} else {
								// when we want to raise
								const raiseLimit = this.botPlayer(this.game).chips - this.amountToCall(this.game);
								const raiseAmount = Math.min(raiseLimit, Math.max(this.amountToCall(this.game), 10));
								if (raiseAmount > 0) return moveDetails(move, raiseAmount);
							}
						}
					}
				}
				const isFaceCard = (card) => {
					const faceCardNum = ['T', 'J', 'Q', 'K', 'A'];
					return faceCardNum.includes(card[0]);
				}
				if (isFaceCard(hand[0]) && isFaceCard(hand[1]) && (hand[0][0] == hand[1][0])) {
					return playInPriorityOrder([moveEnum.RAISE, moveEnum.CALL, moveEnum.CHECK, moveEnum.FOLD]);
				} else if (isFaceCard(hand[0]) && isFaceCard(hand[1])) {
					return playInPriorityOrder([moveEnum.CALL, moveEnum.RAISE, moveEnum.CHECK, moveEnum.FOLD]);
				} else if (isFaceCard(hand[0]) || isFaceCard(hand[1])) {
					return playInPriorityOrder([moveEnum.CALL, moveEnum.CHECK, moveEnum.FOLD]);
				} else {
					return playInPriorityOrder([moveEnum.CHECK, moveEnum.FOLD]);
				}
			default:
				break;
		}
	}

	playTurn = async (botMoveFunc, moveEnum) => {
		/**
		 * Evaluation all available options
		 * Call Python code with list of options
		 * Return action
		 */
		let playOptions = [moveEnum.FOLD];
		if (this.canCheck(this.game)) {
			playOptions.push(moveEnum.CHECK);
		}
		if (this.canCall(this.game)) {
			playOptions.push(moveEnum.CALL);
		}
		if (this.canRaise(this.game)) {
			playOptions.push(moveEnum.RAISE);
		}

		const moveDetails = this.localPlayLogic(this.game, this.hand, playOptions, moveEnum);
		let retObj = botMoveFunc(this, this.game._id, moveDetails.move, moveDetails.raiseAmount)
		console.info(`[${this.username}] Executed ${moveDetails.move} (${moveDetails.raiseAmount}). hand: ${this.hand} [game has: ${this.game.hand}].\n\t\tReceived: ${JSON.stringify(retObj)}`);
	}
}

module.exports = {
	BotPlayer
}