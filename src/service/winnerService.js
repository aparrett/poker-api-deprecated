const { strengthValues } = require('../constants')

const determineBetterHand = (hands, communityCards) => {
    if (hasTwoPair(hands[0], communityCards) || hasTwoPair(hands[1], communityCards)) {
        return getTwoPairWinner(hands, communityCards)
    }

    if (hasPair(hands[0], communityCards) || hasPair(hands[1], communityCards)) {
        return getPairWinner(hands, communityCards)
    }

    const hand = getHandWithHighestCard(hands, communityCards)
    return hand || false
}

const getTwoPairWinner = (hands, communityCards) => {
    if (hasTwoPair(hands[0], communityCards) && !hasTwoPair(hands[1], communityCards)) {
        return hands[0]
    }

    if (hasTwoPair(hands[1], communityCards) && !hasTwoPair(hands[0], communityCards)) {
        return hands[1]
    }

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

const hasTwoPair = (hand, communityCards) => {
    const cards = [...hand, ...communityCards].map(card => toNumberFace(card))
    return new Set(cards).size === cards.length - 2
}

const getPairWinner = (hands, communityCards) => {
    if (hasPair(hands[0], communityCards) && !hasPair(hands[1], communityCards)) {
        return hands[0]
    }

    if (hasPair(hands[1], communityCards) && !hasPair(hands[0], communityCards)) {
        return hands[1]
    }

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

const hasPair = (hand, communityCards) => {
    const cards = [...hand, ...communityCards].map(card => toNumberFace(card))
    return new Set(cards).size !== cards.length
}

const getRestHandStrength = (hand, usedCards, communityCards) => {
    const rest = [...hand, ...communityCards].filter(card => !usedCards.includes(card))
    return highCardStrength(rest)
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

const getHandWithHighestCard = (hands, communityCards) => {
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
    getHandWithHighestCard,
    determineBetterHand
}
