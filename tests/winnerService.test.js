const { determineBetterHand } = require('../src/service/winnerService')
const { strengthValues } = require('../src/constants')

describe('winnerService', () => {
    describe('handStrengths', () => {
        it('should have proper values', () => {
            expect(strengthValues.AL).toEqual(0.001)
            expect(strengthValues.TWO_PAIRS).toEqual(1000000000000)
            expect(strengthValues.ROYAL_FLUSH).toEqual(1000000000000000000)
        })
    })

    describe('determineBetterHand', () => {
        it('should return false if it is a tie', () => {})

        it('Ace counts as a straight - Low', () => {})

        it('Ace counts as a straight - High', () => {})

        it('uses high card as tiebreaker', () => {})

        it('royal flush beats straight flush', () => {})

        it('straight flush beats quads', () => {})

        it('quads beats full house', () => {})

        it('full house beats flush', () => {})

        it('flush beats straight', () => {})

        it('straight beats set', () => {})

        it('set beats two pair', () => {
            const hands = [
                ['10C', '10S'],
                ['KS', 'QC']
            ]
            const communityCards = ['10H', 'KH', 'QD', '8D', '6H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['10C', '10S'])
        })

        it('higher set wins', () => {
            const hands = [
                ['10C', '10S'],
                ['JS', 'JC']
            ]
            const communityCards = ['10H', 'JH', 'QD', '8D', '6H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['JS', 'JC'])
        })

        it('two pair beats one pair', () => {
            const hands = [
                ['10C', 'QC'],
                ['JS', 'KS']
            ]
            const communityCards = ['10H', 'KD', 'QD', '8H', '6H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['10C', 'QC'])
        })

        it('two pair - high pair wins', () => {
            const hands = [
                ['AC', '10C'],
                ['JS', 'KS']
            ]
            const communityCards = ['AH', 'JD', 'KD', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', '10C'])
        })

        it('two pair - second highest pair wins', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', 'KD', 'QD', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', 'KC'])
        })

        it('two pair - kicker', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', 'JD', 'JD', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', 'KC'])
        })

        it('two pair tie', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'KS']
            ]
            const communityCards = ['AH', 'KD', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })

        it('high pair wins', () => {
            const hands = [
                ['AS', 'AC'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'AC'])
        })

        it('high pair wins - reverse', () => {
            const hands = [
                ['KS', 'KC'],
                ['AS', 'AC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'AC'])
        })

        it('high pair - kicker', () => {
            const hands = [
                ['AD', 'KC'],
                ['AS', 'QC']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AD', 'KC'])
        })

        it('one pair tie', () => {
            const hands = [
                ['AC', 'QC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })

        it('one pair beats high card', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['KS', 'KC'])
        })

        it('high card wins', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', '3S']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', '10H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', '2S'])
        })

        it('high card - 4 ties in community', () => {
            const hands = [
                ['8S', '2S'],
                ['7S', '3S']
            ]
            const communityCards = ['AD', 'KD', 'JD', '10H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['8S', '2S'])
        })

        it('high card - tie in hand', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'QH']
            ]
            const communityCards = ['JD', '10D', '2D', '6H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'KS'])
        })

        it('no high card - tie', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'KC']
            ]
            const communityCards = ['JD', '10D', '2D', '6H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })
    })
})
