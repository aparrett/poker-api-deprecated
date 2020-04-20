const { strengthValues } = require('../constants')

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
        if (bestHand1 === 'SET') {
            return getSetWinner(hands, communityCards)
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

const getSetWinner = (hands, communityCards) => {
    const hand1Set = getSet(hands[0], communityCards)
    const hand2Set = getSet(hands[1], communityCards)

    const setStrength1 = strengthValues[toNumberFace(hand1Set[0])]
    const setStrength2 = strengthValues[toNumberFace(hand2Set[0])]

    return setStrength1 > setStrength2 ? hands[0] : hands[1]
}

const getSet = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards].map(card => toNumberFace(card))
    cards.forEach(card => {
        if (countsMap[card]) {
            countsMap[card] += 1
        } else {
            countsMap[card] = 1
        }
    })

    const setCards = cards.filter(card => countsMap[card] === 3)
    let maxNumberFace
    setCards.forEach(card => {
        if (!maxNumberFace || strengthValues[card] > strengthValues[maxNumberFace]) {
            maxNumberFace = card
        }
    })

    return [...hand, ...communityCards].filter(card => toNumberFace(card) === maxNumberFace)
}

const getTwoPairs = (hand, communityCards) => {
    const cardMap = {}
    let firstPair
    for (const card of [...hand, ...communityCards]) {
        const pairCard = cardMap[toNumberFace(card)]
        if (pairCard) {
            if (!firstPair) {
                firstPair = [card, pairCard]
            } else {
                return [firstPair, [card, pairCard]]
            }
        }
        cardMap[toNumberFace(card)] = card
    }
}

const getTwoPairWinner = (hands, communityCards) => {
    const hand1Pairs = getTwoPairs(hands[0], communityCards)
    const hand2Pairs = getTwoPairs(hands[1], communityCards)

    const twoPairStrength1 =
        strengthValues[toNumberFace(hand1Pairs[0][0])] + strengthValues[toNumberFace(hand1Pairs[1][0])]
    const twoPairStrength2 =
        strengthValues[toNumberFace(hand2Pairs[0][0])] + strengthValues[toNumberFace(hand2Pairs[1][0])]

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
        const pairCard = cardMap[toNumberFace(card)]
        if (pairCard) {
            return [card, pairCard]
        }
        cardMap[toNumberFace(card)] = card
    }
}

const getPairWinner = (hands, communityCards) => {
    const hand1Pair = getPair(hands[0], communityCards)
    const hand2Pair = getPair(hands[1], communityCards)

    const pairStrength1 = strengthValues[toNumberFace(hand1Pair[0])]
    const pairStrength2 = strengthValues[toNumberFace(hand2Pair[0])]

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

const getBestHand = (hand, communityCards) => {
    const countsMap = {}
    const cards = [...hand, ...communityCards].map(card => toNumberFace(card))
    cards.forEach(card => {
        if (countsMap[card]) {
            countsMap[card] += 1
        } else {
            countsMap[card] = 1
        }
    })

    const counts = Object.values(countsMap)
    if (counts.includes(4)) {
        return 'QUADS'
    }

    if (counts.includes(3)) {
        return 'SET'
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
        .map(card => strengthValues[toNumberFace(card)])
        .sort()
        .slice(cards.length - 5, cards.length)
        .reduce((acc, val) => acc + val)
}

// Currently search for a term that describes the number or face part of a card.
const toNumberFace = card => card.slice(0, card.length - 1)

module.exports = {
    determineBetterHand
}
