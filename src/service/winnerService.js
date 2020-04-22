const { strengthValues, FACES } = require('../constants')

const determineBetterHand = (hands, communityCards) => {
    const bestHand1 = getBestHand(hands[0], communityCards)
    const bestHand2 = getBestHand(hands[1], communityCards)
    /**
     *
     * TODO: group by best hands before comparing hand to hand.
     *
     *
     */

    if (!bestHand1 && !bestHand2) {
        const hand = getHighestCardWinner(hands, communityCards)
        return hand || false
    }

    if (bestHand1 === bestHand2) {
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

// Remember: There can be no ties with a flush because there can only be one suit with
// a flush.
const getFlushWinner = (hands, communityCards) => {
    const flush1 = getFlush(hands[0], communityCards)
    const flush2 = getFlush(hands[1], communityCards)
    const hand1strength = highCardStrength(flush1)
    const hand2strength = highCardStrength(flush2)
    return hand1strength > hand2strength ? hands[0] : hands[1]
}

const getFlush = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards]
    cards.forEach(card => {
        if (countsMap[card[1]]) {
            countsMap[card[1]] += 1
        } else {
            countsMap[card[1]] = 1
        }
    })

    if (!Object.values(countsMap).includes(5)) {
        return false
    }

    const suit = Object.keys(countsMap).find(suit => countsMap[suit] === 5)
    return cards
        .filter(card => card[1] === suit)
        .sort((a, b) => {
            return FACES.indexOf(a[0]) - FACES.indexOf(b[0])
        })
        .slice(0, 5)
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

const getPair = (hand, communityCards) => {
    const cardMap = {}
    for (const card of [...hand, ...communityCards]) {
        const pairCard = cardMap[card[0]]
        if (pairCard) {
            return [card, pairCard]
        }
        cardMap[card[0]] = card
    }
}

const getPairWinner = (hands, communityCards) => {
    const hand1Pair = getPair(hands[0], communityCards)
    const hand2Pair = getPair(hands[1], communityCards)

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

    const counts = Object.values(countsMap)
    if (counts.includes(4)) {
        return 'QUADS'
    }

    if (getFlush(hand, communityCards)) {
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
    hasStraight
}
