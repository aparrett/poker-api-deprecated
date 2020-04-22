const { determineBetterHand, hasStraight } = require('../src/service/winnerService')
const { strengthValues } = require('../src/constants')

describe('winnerService', () => {
    describe('handStrengths', () => {
        it('should have proper values', () => {
            expect(strengthValues['2']).toEqual(0.001)
            expect(strengthValues.TWO_PAIRS).toEqual(100000000000)
            expect(strengthValues.ROYAL_FLUSH).toEqual(100000000000000000)
        })
    })

    describe('hasStraight', () => {
        it('should return true when broadway straight', () => {
            const faces = ['J', 'T', 'K', 'Q', 'A', '2', '3']
            const result = hasStraight(faces)
            expect(result).toEqual(true)
        })

        it('should return true when Ace is low', () => {
            const faces = ['8', 'T', '3', 'A', '2', '4', '5']
            const result = hasStraight(faces)
            expect(result).toEqual(true)
        })

        it('should return true with straight in the middle', () => {
            const faces = ['2', '7', '6', '8', '9', 'T', 'Q']
            const result = hasStraight(faces)
            expect(result).toEqual(true)
        })

        it('should return false if there is no straight', () => {
            const faces = ['2', '5', '6', '7', 'J', 'Q', 'A']
            const result = hasStraight(faces)
            expect(result).toEqual(false)
        })

        it('should not mutate the parameter', () => {
            const faces = ['2', '5', '6', '7', 'J', 'Q', 'A']
            hasStraight(faces)
            expect(faces.join('')).toEqual('2567JQA')
        })

        it('should return true when there are duplicates', () => {
            const faces = ['2', '7', '8', '8', '9', 'T', 'J']
            const result = hasStraight(faces)
            expect(result).toEqual(true)
        })

        it('should return true - extra cases for fun', () => {
            expect(hasStraight(['2', '3', '4', '5', '9', 'Q', '6'])).toEqual(true)
            expect(hasStraight(['K', '3', 'J', 'T', '9', 'Q', '2'])).toEqual(true)
            expect(hasStraight(['9', '9', 'K', 'Q', '9', 'T', 'J'])).toEqual(true)
            expect(hasStraight(['A', '2', '2', 'K', 'J', 'Q', 'T'])).toEqual(true)
        })

        it('should return false - extra cases for fun', () => {
            expect(hasStraight(['2', '4', '6', '8', 'T', 'Q', 'A'])).toEqual(false)
            expect(hasStraight(['2', '3', '4', 'A', '9', 'Q', 'A'])).toEqual(false)
            expect(hasStraight(['9', '9', 'A', 'Q', '9', 'T', 'J'])).toEqual(false)
            expect(hasStraight(['6', '7', '8', '9', 'J', 'Q', 'K'])).toEqual(false)
        })
    })

    describe('determineBetterHand', () => {
        it('should return false if it is a tie', () => {})

        it('royal flush beats straight flush', () => {})

        it('straight flush beats quads', () => {})

        it('quads beats full house', () => {})

        it('full house beats flush', () => {})

        it('high flush wins last card high', () => {
            const hands = [
                ['2D', 'TS'],
                ['3D', 'TH']
            ]
            const communityCards = ['6D', '8D', 'JD', 'TD', 'KH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['3D', 'TH'])
        })

        it('higher flush wins - 5 cards', () => {
            const hands = [
                ['KD', '5D'],
                ['9D', '6D']
            ]
            const communityCards = ['TS', '3D', 'JD', 'TD', '5H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['KD', '5D'])
        })

        it('higher flush wins - 6 cards', () => {
            const hands = [
                ['KD', '5D'],
                ['9D', '6D']
            ]
            const communityCards = ['TS', '3D', 'JD', 'TD', '2D']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['KD', '5D'])
        })

        it('flush beats straight', () => {
            const hands = [
                ['AC', '5S'],
                ['2D', '7D']
            ]
            const communityCards = ['KH', 'QD', 'JD', 'TD', '5H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['2D', '7D'])
        })

        it('same straight should tie', () => {
            const hands = [
                ['AC', '5S'],
                ['AS', '7C']
            ]
            const communityCards = ['KH', 'QH', 'JD', 'TD', '5H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })

        it('straight with Ace high beats straight with King high', () => {
            const hands = [
                ['AC', '5S'],
                ['9S', '7C']
            ]
            const communityCards = ['KH', 'QH', 'JD', 'TD', '5H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', '5S'])
        })

        it('straight with 6 high beats straight with 5 high', () => {
            const hands = [
                ['6C', '9S'],
                ['KS', 'KC']
            ]
            const communityCards = ['AH', '2H', '3D', '4D', '5H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['6C', '9S'])
        })

        it('straight beats trips', () => {
            const hands = [
                ['TC', '9S'],
                ['KS', 'KC']
            ]
            const communityCards = ['KH', 'QH', 'JD', '5D', '2H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['TC', '9S'])
        })

        it('trips beats two pair', () => {
            const hands = [
                ['TC', 'TS'],
                ['KS', 'QC']
            ]
            const communityCards = ['TH', 'KH', 'QD', '8D', '6H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['TC', 'TS'])
        })

        it('higher trips wins', () => {
            const hands = [
                ['TC', 'TS'],
                ['JS', 'JC']
            ]
            const communityCards = ['TH', 'JH', 'QD', '8D', '6H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['JS', 'JC'])
        })

        it('two pair beats one pair', () => {
            const hands = [
                ['TC', 'QC'],
                ['JS', 'KS']
            ]
            const communityCards = ['TH', 'KD', 'QD', '8H', '6H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['TC', 'QC'])
        })

        it('two pair - high pair wins', () => {
            const hands = [
                ['AC', 'TC'],
                ['JS', 'KS']
            ]
            const communityCards = ['AH', 'JD', 'KD', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', 'TC'])
        })

        it('two pair - second highest pair wins', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', 'KD', 'QD', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', 'KC'])
        })

        it('two pair - kicker', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', 'JD', 'JD', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AC', 'KC'])
        })

        it('two pair tie', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'KS']
            ]
            const communityCards = ['AH', 'KD', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })

        it('high pair wins', () => {
            const hands = [
                ['AS', 'AC'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'AC'])
        })

        it('high pair wins - reverse', () => {
            const hands = [
                ['KS', 'KC'],
                ['AS', 'AC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'AC'])
        })

        it('high pair - kicker', () => {
            const hands = [
                ['AD', 'KC'],
                ['AS', 'QC']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AD', 'KC'])
        })

        it('one pair tie', () => {
            const hands = [
                ['AC', 'QC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })

        it('one pair beats high card', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['KS', 'KC'])
        })

        it('high card wins', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', '3S']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', '2S'])
        })

        it('high card - 4 ties in community', () => {
            const hands = [
                ['8S', '2S'],
                ['7S', '3S']
            ]
            const communityCards = ['AD', 'KD', 'JD', 'TH', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['8S', '2S'])
        })

        it('high card - tie in hand', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'QH']
            ]
            const communityCards = ['JD', 'TD', '2D', '6H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(['AS', 'KS'])
        })

        it('no high card - tie', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'KC']
            ]
            const communityCards = ['JD', 'TD', '2D', '6H', '4H']

            const result = determineBetterHand(hands, communityCards)
            expect(result).toEqual(false)
        })
    })
})
