const { strengthValues, handTypes, FACES } = require('../constants')
const encryptionService = require('./encryptionService')

const getPlayerByHand = (player, hand) =>
    player.hand &&
    encryptionService.decryptHand(player.hand)[0] === hand[0] &&
    encryptionService.decryptHand(player.hand)[1] === hand[1]

const combineData = (game, hand) => {
    const player = game.players.find(player => getPlayerByHand(player, hand))
    const sidePot = game.sidePots.find(sidePot => sidePot.playerId.toString() === player._id.toString())
    return { player, sidePot, hand }
}

const expandAndSortHandRanks = (game, handRanks) => {
    return handRanks.map(row => {
        const isTie = row.length > 1
        if (!isTie) {
            return [combineData(game, row[0])]
        } else {
            rowWithCombinedData = row.map(hand => combineData(game, hand))
            // if there is a tie, sort the hands by smallest sidepot to largest.
            // hands that don't have a sidepot will be at the end and get all of the remaining chips.
            rowWithCombinedData.sort((hand1, hand2) => {
                if (!hand1.sidePot) {
                    return 1
                }
                if (!hand2.sidePot) {
                    return -1
                }
                return hand1.sidePot.amount - hand2.sidePot.amount
            })
            return rowWithCombinedData
        }
    })
}

const distributeChipsToWinners = (game, handRanks) => {
    const expandedHandRanks = expandAndSortHandRanks(game, handRanks)

    // resets winners from the last round.
    game.winners = []

    let highestSidePot = 0

    // when each sidepot takes their share, that amount must be taken from the amount left in the group of sidepots
    let amountTakenFromSidepots = 0

    for (const row of expandedHandRanks) {
        // The less sign is here because, due to rounding, there could be an extreme edge case where the pot is -1 or -2.
        if (game.pot <= 0) {
            return game
        }

        const isTie = row.length > 1

        if (!isTie) {
            const { player, sidePot, hand } = row[0]
            if (sidePot) {
                const amount = sidePot.amount - highestSidePot
                player.chips += amount
                game.pot -= amount
                highestSidePot = amount
                game.winners.push({
                    playerId: player._id,
                    amount,
                    hand,
                    handType: handTypes[getBestHand(hand, game.communityCards)] || 'HIGH CARD'
                })
            } else {
                player.chips += game.pot
                game.winners.push({
                    playerId: player._id,
                    amount: game.pot,
                    hand,
                    handType: handTypes[getBestHand(hand, game.communityCards)] || 'HIGH CARD'
                })
                game.pot = 0
                return game
            }
        } else {
            let previousSidePot

            row.forEach((data, i) => {
                const { player, sidePot, hand } = data
                let splitAmount

                if (sidePot) {
                    const { amount } = sidePot
                    const numerator = amount <= game.pot ? amount : game.pot

                    // If a player in a row before this player (better hand) had a higher pot, this player gets nothing.
                    // However, if a player had a better hand but a lower side pot, this player can still win.
                    if (amount >= highestSidePot) {
                        let denominator

                        // If the players have the same sidepot, they should get the same amount
                        if (amount === previousSidePot) {
                            denominator = previousSidePot.index
                            splitAmount = Math.round(numerator / denominator)
                        } else {
                            denominator = row.length - i
                            highestSidePot = amount
                            previousSidePot = { amount, index: i }
                            splitAmount = Math.round((numerator - amountTakenFromSidepots) / denominator)
                        }
                        amountTakenFromSidepots += splitAmount
                    }
                } else {
                    // Because we are subtracting the player's amount each time, this formula allows us
                    // to split the pot evenly between the rest of the players without sidepots
                    splitAmount = Math.round(game.pot / (row.length - i))
                }

                player.chips += splitAmount
                game.pot -= splitAmount
                game.winners.push({
                    playerId: player._id,
                    amount: splitAmount,
                    hand,
                    handType: handTypes[getBestHand(hand, game.communityCards)] || 'HIGH CARD'
                })
            })
        }
    }

    return game
}

// Returns all of the hands in the game from Highest rank to Lowest.
const getHandRanks = game => {
    const { communityCards } = game
    const remainingPlayers = game.players.filter(player => player.hand)
    const hands = remainingPlayers.map(player => encryptionService.decryptHand(player.hand))
    const sortedHandGroups = groupAndSortHandsByHandTypeStrength(hands, communityCards)
    const winningOrder = []

    sortedHandGroups.forEach(handsGroup => {
        if (handsGroup.length === 1) {
            return winningOrder.push([handsGroup[0]])
        }

        /**  
        The idea here is to loop through all of the hands and remove any ties to the comparison hand.
        Doing this allows us to sort the hands (and determine the winning order of them) without 
        dealing with the ties in the sort. Then we add the ties back in later so they are still a part of the
        winning order. 
        */

        const tiesMap = {}
        const handsToSort = []

        // Remove the ties from the hands to sort.
        handsGroup.forEach(hand => {
            let noTies = true
            handsToSort.forEach(handJ => {
                if (!determineBetterHand([hand, handJ], communityCards)) {
                    noTies = false
                    if (!tiesMap[handJ[0]]) {
                        tiesMap[handJ[0]] = [hand]
                    } else {
                        tiesMap[handJ[0]].push(hand)
                    }
                }
            })
            if (noTies) {
                handsToSort.push(hand)
            }
        })

        handsToSort.sort((a, b) => {
            return determineBetterHand([a, b], communityCards)[0] === a[0] ? -1 : 1
        })

        handsToSort.forEach(hand => {
            const ties = tiesMap[hand[0]]
            if (ties) {
                winningOrder.push([hand, ...ties])
            } else {
                winningOrder.push([hand])
            }
        })
    })

    return winningOrder
}

const groupAndSortHandsByHandTypeStrength = (hands, communityCards) => {
    const bestHandsMap = {}
    hands.forEach(hand => {
        const bestHand = getBestHand(hand, communityCards) || 'HIGH_CARD'

        if (!bestHandsMap[bestHand]) {
            bestHandsMap[bestHand] = [hand]
        } else {
            bestHandsMap[bestHand].push(hand)
        }
    })

    return Object.keys(bestHandsMap)
        .sort((a, b) => {
            if (a === 'HIGH_CARD') {
                return 1
            }

            if (b === 'HIGH_CARD') {
                return -1
            }

            return strengthValues[b] - strengthValues[a]
        })
        .map(handType => bestHandsMap[handType])
}

const determineBetterHand = (hands, communityCards) => {
    const bestHand1 = getBestHand(hands[0], communityCards)
    const bestHand2 = getBestHand(hands[1], communityCards)

    if (!bestHand1 && !bestHand2) {
        const hand = getHighestCardWinner(hands, communityCards)
        return hand || false
    }

    if (bestHand1 && !bestHand2) {
        return hands[0]
    }

    if (!bestHand1 && bestHand2) {
        return hands[1]
    }

    if (bestHand1 === bestHand2) {
        if (bestHand1 === 'ROYAL_FLUSH') {
            return false
        }

        if (bestHand1 === 'STRAIGHT_FLUSH') {
            return getStraightFlushWinner(hands, communityCards)
        }

        if (bestHand1 === 'QUADS') {
            return getQuadsWinner(hands, communityCards)
        }

        if (bestHand1 === 'FULL_HOUSE') {
            return getFullHouseWinner(hands, communityCards)
        }

        if (bestHand1 === 'FLUSH') {
            return getFlushWinner(hands, communityCards)
        }

        if (bestHand1 === 'STRAIGHT') {
            return getStraightWinner(hands, communityCards)
        }

        if (bestHand1 === 'TRIPS') {
            return getTripsWinner(hands, communityCards)
        }

        if (bestHand1 === 'TWO_PAIRS') {
            return getTwoPairWinner(hands, communityCards)
        }

        if (bestHand1 === 'PAIR') {
            return getPairWinner(hands, communityCards)
        }
    }

    return strengthValues[bestHand1] > strengthValues[bestHand2] ? hands[0] : hands[1]
}

const getQuadsWinner = (hands, communityCards) => {
    const quads1 = getQuads(hands[0], communityCards)
    const quads2 = getQuads(hands[1], communityCards)

    const face1Strength = strengthValues[quads1[0][0]]
    const face2Strength = strengthValues[quads2[0][0]]

    if (face1Strength === face2Strength) {
        return getHighestCardWinner(hands, communityCards)
    }

    return face1Strength > face2Strength ? hands[0] : hands[1]
}

const getQuads = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards]

    cards.forEach(card => {
        if (countsMap[card[0]]) {
            countsMap[card[0]] += 1
        } else {
            countsMap[card[0]] = 1
        }
    })

    const face = Object.keys(countsMap).find(face => countsMap[face] === 4)
    return cards.filter(card => card[0] === face)
}

const getFullHouseWinner = (hands, communityCards) => {
    const trips1 = getTrips(hands[0], communityCards)
    const trips2 = getTrips(hands[1], communityCards)
    const trips1Face = trips1[0][0]
    const trips2Face = trips2[0][0]

    if (trips1Face !== trips2Face) {
        return strengthValues[trips1Face] > strengthValues[trips2Face] ? hands[0] : hands[1]
    }

    const hand1Unused = hands[0].filter(card => card[0] !== trips1Face)
    const hand2Unused = hands[1].filter(card => card[0] !== trips1Face)
    const communityUnused = communityCards.filter(card => card[0] !== trips1Face)

    const hand1Pair = getHighestPair(hand1Unused, communityUnused)
    const hand2Pair = getHighestPair(hand2Unused, communityUnused)

    const pairStrength1 = strengthValues[hand1Pair[0][0]]
    const pairStrength2 = strengthValues[hand2Pair[0][0]]

    if (pairStrength1 === pairStrength2) {
        return false
    }

    return pairStrength1 > pairStrength2 ? hands[0] : hands[1]
}

const getFlushWinner = (hands, communityCards) => {
    const flush1 = getHighestFlush(hands[0], communityCards)
    const flush2 = getHighestFlush(hands[1], communityCards)
    const hand1strength = highCardStrength(flush1)
    const hand2strength = highCardStrength(flush2)
    if (hand1strength === hand2strength) {
        return false
    }
    return hand1strength > hand2strength ? hands[0] : hands[1]
}

const getStraightFlush = (hand, communityCards) => {
    const flushCards = getFlushCards(hand, communityCards)
    if (!flushCards) {
        return false
    }

    const straight = getStraight(flushCards.map(card => card[0]))
    if (!straight) {
        return false
    }

    return flushCards.filter(card => straight.includes(card[0]))
}

const getStraightFlushWinner = (hands, communityCards) => {
    const sf1 = getStraightFlush(hands[0], communityCards)
    const sf2 = getStraightFlush(hands[1], communityCards)

    // Unnecessary to check suit as there can only be one flush suit.
    if (sf1[0][0] === sf2[0][0]) {
        return false
    }

    return strengthValues[sf1[0][0]] > strengthValues[sf2[0][0]] ? hands[0] : hands[1]
}

const getFlushCards = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards]
    cards.forEach(card => {
        if (countsMap[card[1]]) {
            countsMap[card[1]] += 1
        } else {
            countsMap[card[1]] = 1
        }
    })

    const counts = Object.values(countsMap)
    if (!counts.includes(5) && !counts.includes(6) && !counts.includes(7)) {
        return false
    }

    const suit = Object.keys(countsMap).find(suit => countsMap[suit] >= 5)

    return cards
        .filter(card => card[1] === suit)
        .sort((a, b) => {
            return FACES.indexOf(a[0]) - FACES.indexOf(b[0])
        })
}

const getHighestFlush = (hand, communityCards) => {
    const flushCards = getFlushCards(hand, communityCards)
    if (!flushCards) {
        return false
    }

    return flushCards.slice(0, 5)
}

const getStraightWinner = (hands, communityCards) => {
    const straight1 = getStraight([...hands[0], ...communityCards].map(c => c[0]))
    const straight2 = getStraight([...hands[1], ...communityCards].map(c => c[0]))
    if (straight1[0] === straight2[0]) {
        return false
    }
    return strengthValues[straight1[0]] > strengthValues[straight2[0]] ? hands[0] : hands[1]
}

const getTripsWinner = (hands, communityCards) => {
    const hand1Trips = getTrips(hands[0], communityCards)
    const hand2Trips = getTrips(hands[1], communityCards)

    const setStrength1 = strengthValues[hand1Trips[0][0]]
    const setStrength2 = strengthValues[hand2Trips[0][0]]

    if (setStrength1 === setStrength2) {
        const restHandStrength1 = getRestHandStrength(hands[0], hand1Trips, communityCards)
        const restHandStrength2 = getRestHandStrength(hands[1], hand2Trips, communityCards)
        if (restHandStrength1 === restHandStrength2) {
            return false
        }
        return restHandStrength1 > restHandStrength2 ? hands[0] : hands[1]
    }

    return setStrength1 > setStrength2 ? hands[0] : hands[1]
}

const getTrips = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards]
    cards.forEach(card => {
        if (countsMap[card[0]]) {
            countsMap[card[0]] += 1
        } else {
            countsMap[card[0]] = 1
        }
    })

    const setCards = cards.filter(card => countsMap[card[0]] === 3)
    let maxFace
    setCards.forEach(card => {
        if (!maxFace || strengthValues[card[0]] > strengthValues[maxFace]) {
            maxFace = card[0]
        }
    })

    return cards.filter(card => card[0] === maxFace)
}

const getTwoPairs = (hand, communityCards) => {
    const cardMap = {}
    let firstPair
    for (const card of [...hand, ...communityCards]) {
        const pairCard = cardMap[card[0]]
        if (pairCard) {
            if (!firstPair) {
                firstPair = [card, pairCard]
            } else {
                return [firstPair, [card, pairCard]]
            }
        }
        cardMap[card[0]] = card
    }
}

const getTwoPairWinner = (hands, communityCards) => {
    const hand1Pairs = getTwoPairs(hands[0], communityCards)
    const hand2Pairs = getTwoPairs(hands[1], communityCards)
    const twoPairStrength1 = strengthValues[hand1Pairs[0][0][0]] + strengthValues[hand1Pairs[1][0][0]]
    const twoPairStrength2 = strengthValues[hand2Pairs[0][0][0]] + strengthValues[hand2Pairs[1][0][0]]

    if (twoPairStrength1 === twoPairStrength2) {
        const hand1UsedCards = [...hand1Pairs[0], ...hand1Pairs[1]]
        const hand2UsedCards = [...hand2Pairs[0], ...hand2Pairs[1]]
        const restHandStrength1 = getRestHandStrength(hands[0], hand1UsedCards, communityCards)
        const restHandStrength2 = getRestHandStrength(hands[1], hand2UsedCards, communityCards)
        if (restHandStrength1 === restHandStrength2) {
            return false
        }
        return restHandStrength1 > restHandStrength2 ? hands[0] : hands[1]
    } else {
        return twoPairStrength1 > twoPairStrength2 ? hands[0] : hands[1]
    }
}

const getHighestPair = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards]
    const faces = cards.map(card => card[0])
    faces.forEach(face => {
        if (countsMap[face]) {
            countsMap[face] += 1
        } else {
            countsMap[face] = 1
        }
    })

    const counts = Object.values(countsMap)

    const onlyOnePair = counts.filter(count => count === 2).length === 1
    if (onlyOnePair) {
        const face = Object.keys(countsMap).find(face => countsMap[face] === 2)
        return cards.filter(card => card[0] === face)
    }

    let maxPair
    const pairFaces = Object.keys(countsMap).filter(face => countsMap[face] === 2)
    pairFaces.forEach(face => {
        if (!maxPair || strengthValues[face] > strengthValues[maxPair[0][0]]) {
            maxPair = cards.filter(card => card[0] === face)
        }
    })

    return maxPair
}

const getPairWinner = (hands, communityCards) => {
    const hand1Pair = getHighestPair(hands[0], communityCards)
    const hand2Pair = getHighestPair(hands[1], communityCards)

    const pairStrength1 = strengthValues[hand1Pair[0][0]]
    const pairStrength2 = strengthValues[hand2Pair[0][0]]

    if (pairStrength1 === pairStrength2) {
        const restHandStrength1 = getRestHandStrength(hands[0], hand1Pair, communityCards)
        const restHandStrength2 = getRestHandStrength(hands[1], hand2Pair, communityCards)
        if (restHandStrength1 === restHandStrength2) {
            return false
        }
        return restHandStrength1 > restHandStrength2 ? hands[0] : hands[1]
    } else {
        return pairStrength1 > pairStrength2 ? hands[0] : hands[1]
    }
}

const hasStraight = faces => !!getStraight(faces)

const getStraight = faces => {
    const facesCopy = [...new Set(faces)]
    facesCopy.sort((a, b) => {
        return FACES.indexOf(a) - FACES.indexOf(b)
    })

    if (facesCopy.join('').includes('5432') && facesCopy.includes('A') && !facesCopy.includes('6')) {
        return '5432A'
    }

    if (FACES.join('').includes(facesCopy.slice(0, 5).join(''))) {
        return facesCopy.slice(0, 5).join('')
    }

    if (facesCopy.length > 5 && FACES.join('').includes(facesCopy.slice(1, 6).join(''))) {
        return facesCopy.slice(1, 6).join('')
    }

    if (facesCopy.length > 6 && FACES.join('').includes(facesCopy.slice(2, 7).join(''))) {
        return facesCopy.slice(2, 7).join('')
    }

    return false
}

const getBestHand = (hand, communityCards) => {
    const countsMap = {}
    const faces = [...hand, ...communityCards].map(card => card[0])
    faces.forEach(face => {
        if (countsMap[face]) {
            countsMap[face] += 1
        } else {
            countsMap[face] = 1
        }
    })

    const straightFlush = getStraightFlush(hand, communityCards)
    if (straightFlush) {
        if (straightFlush[0][0] === 'A') {
            return 'ROYAL_FLUSH'
        } else {
            return 'STRAIGHT_FLUSH'
        }
    }

    const counts = Object.values(countsMap)
    if (counts.includes(4)) {
        return 'QUADS'
    }

    const hasTwoTrips = counts.filter(count => count === 3).length === 2
    if (hasTwoTrips || (counts.includes(2) && counts.includes(3))) {
        return 'FULL_HOUSE'
    }

    if (getFlushCards(hand, communityCards)) {
        return 'FLUSH'
    }

    if (hasStraight(faces)) {
        return 'STRAIGHT'
    }

    if (counts.includes(3)) {
        return 'TRIPS'
    }

    if (counts.includes(2)) {
        if (counts.filter(count => count === 2).length > 1) {
            return 'TWO_PAIRS'
        } else {
            return 'PAIR'
        }
    }

    return false
}

const getRestHandStrength = (hand, usedCards, communityCards) => {
    const rest = [...hand, ...communityCards].filter(card => !usedCards.includes(card))
    return highCardStrength(rest)
}

const getHighestCardWinner = (hands, communityCards) => {
    const hand1strength = highCardStrength([...hands[0], ...communityCards])
    const hand2strength = highCardStrength([...hands[1], ...communityCards])
    if (hand1strength === hand2strength) {
        return false
    }
    return hand1strength > hand2strength ? hands[0] : hands[1]
}

const highCardStrength = cards => {
    return cards
        .map(card => strengthValues[card[0]])
        .sort()
        .slice(cards.length - 5, cards.length)
        .reduce((acc, val) => acc + val)
}

module.exports = {
    determineBetterHand,
    hasStraight,
    groupAndSortHandsByHandTypeStrength,
    getHandRanks,
    distributeChipsToWinners
}
