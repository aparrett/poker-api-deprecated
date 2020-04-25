const { determineBetterHand, hasStraight } = require('../src/service/winnerService')

// Used to verify the same result given the hands in opposite order.
const reverseOrder = hands => [hands[1], hands[0]]

describe('winnerService', () => {
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
        it('royal flush beats straight flush', () => {
            const hands = [
                ['AS', 'KS'],
                ['6S', '9S']
            ]
            const communityCards = ['QS', 'JS', 'TS', '7S', '8S']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', 'KS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', 'KS'])
        })

        it('royal flush beats Quads', () => {
            const hands = [
                ['AS', 'KS'],
                ['8D', '8S']
            ]
            const communityCards = ['QS', 'JS', 'TS', '8C', '8H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', 'KS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', 'KS'])
        })

        it('royal flush tie', () => {
            const hands = [
                ['2C', '3D'],
                ['4C', '5D']
            ]
            const communityCards = ['QS', 'JS', 'TS', 'AS', 'KS']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('straight flush beats quads', () => {
            const hands = [
                ['AS', 'AH'],
                ['6S', '7S']
            ]
            const communityCards = ['AC', 'AD', '4S', '5S', '6S']

            expect(determineBetterHand(hands, communityCards)).toEqual(['6S', '7S'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['6S', '7S'])
        })

        it('higher straight flush wins', () => {
            const hands = [
                ['8S', 'QH'],
                ['2D', 'KC']
            ]
            const communityCards = ['3S', '4S', '5S', '6S', '7S']

            expect(determineBetterHand(hands, communityCards)).toEqual(['8S', 'QH'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['8S', 'QH'])
        })

        it('straight flush tie', () => {
            const hands = [
                ['AC', 'AH'],
                ['KC', 'KH']
            ]
            const communityCards = ['2S', '3S', '4S', '5S', '6S']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('higher quads wins', () => {
            const hands = [
                ['AS', 'AH'],
                ['KC', 'KS']
            ]
            const communityCards = ['KD', 'KH', '7H', 'AD', 'AC']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', 'AH'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', 'AH'])
        })

        it('quads kicker', () => {
            const hands = [
                ['KS', '2H'],
                ['2C', 'AS']
            ]
            const communityCards = ['8D', '8S', '8H', '8C', '2S']

            expect(determineBetterHand(hands, communityCards)).toEqual(['2C', 'AS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['2C', 'AS'])
        })

        it('quads tie', () => {
            const hands = [
                ['6S', '2H'],
                ['2C', '3S']
            ]
            const communityCards = ['8D', '8S', '8H', '8C', 'AH']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('quads beats full house', () => {
            const hands = [
                ['AS', 'AH'],
                ['KC', 'KS']
            ]
            const communityCards = ['KD', 'KH', '7H', '8C', 'AC']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KC', 'KS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KC', 'KS'])
        })

        it('full house - tie', () => {
            const hands = [
                ['KS', '2C'],
                ['KC', 'AS']
            ]
            const communityCards = ['KD', 'KH', 'QD', 'QH', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('full house - higher trips', () => {
            const hands = [
                ['KS', 'KC'],
                ['TC', 'TS']
            ]
            const communityCards = ['TH', 'KH', 'QD', 'QD', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KS', 'KC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KS', 'KC'])
        })

        it('full house - same trips, higher pair', () => {
            const hands = [
                ['TC', 'QS'],
                ['KS', 'QC']
            ]
            const communityCards = ['TH', 'KH', 'QD', 'QH', '6D']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KS', 'QC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KS', 'QC'])
        })

        it('full house beats two pair', () => {
            const hands = [
                ['AC', '2S'],
                ['KS', 'KC']
            ]
            const communityCards = ['KH', 'TH', 'TD', 'AD', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KS', 'KC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KS', 'KC'])
        })

        it('full house beats flush', () => {
            const hands = [
                ['TC', 'TS'],
                ['AD', '8D']
            ]
            const communityCards = ['TH', 'QH', 'QD', '7D', '6D']

            expect(determineBetterHand(hands, communityCards)).toEqual(['TC', 'TS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['TC', 'TS'])
        })

        it('high flush wins last card high', () => {
            const hands = [
                ['2D', 'TS'],
                ['3D', 'TH']
            ]
            const communityCards = ['6D', '8D', 'JD', 'TD', 'KH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['3D', 'TH'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['3D', 'TH'])
        })

        it('higher flush wins - 5 cards', () => {
            const hands = [
                ['KD', '5D'],
                ['9D', '6D']
            ]
            const communityCards = ['TS', '3D', 'JD', 'TD', '5H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KD', '5D'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KD', '5D'])
        })

        it('higher flush wins - 6 cards', () => {
            const hands = [
                ['KD', '5D'],
                ['9D', '6D']
            ]
            const communityCards = ['TS', '3D', 'JD', 'TD', '2D']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KD', '5D'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KD', '5D'])
        })

        it('flush beats straight', () => {
            const hands = [
                ['AC', '5S'],
                ['2D', '7D']
            ]
            const communityCards = ['KH', 'QD', 'JD', 'TD', '5H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['2D', '7D'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['2D', '7D'])
        })

        it('6 card flush beats straight', () => {
            const hands = [
                ['AC', '5S'],
                ['2D', '7D']
            ]
            const communityCards = ['KH', 'QD', 'JD', 'TD', '5D']

            expect(determineBetterHand(hands, communityCards)).toEqual(['2D', '7D'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['2D', '7D'])
        })

        it('same straight should tie', () => {
            const hands = [
                ['AC', '5S'],
                ['AS', '7C']
            ]
            const communityCards = ['KH', 'QH', 'JD', 'TD', '5H']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('straight with Ace high beats straight with King high', () => {
            const hands = [
                ['AC', '5S'],
                ['9S', '7C']
            ]
            const communityCards = ['KH', 'QH', 'JD', 'TD', '5H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AC', '5S'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AC', '5S'])
        })

        it('straight with 6 high beats straight with 5 high', () => {
            const hands = [
                ['6C', '9S'],
                ['KS', 'KC']
            ]
            const communityCards = ['AH', '2H', '3D', '4D', '5H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['6C', '9S'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['6C', '9S'])
        })

        it('straight beats trips', () => {
            const hands = [
                ['TC', '9S'],
                ['KS', 'KC']
            ]
            const communityCards = ['KH', 'QH', 'JD', '5D', '2H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['TC', '9S'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['TC', '9S'])
        })

        it('trips beats two pair', () => {
            const hands = [
                ['TC', 'TS'],
                ['KS', 'QC']
            ]
            const communityCards = ['TH', 'KH', 'QD', '8D', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['TC', 'TS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['TC', 'TS'])
        })

        it('higher trips wins', () => {
            const hands = [
                ['TC', 'TS'],
                ['JS', 'JC']
            ]
            const communityCards = ['TH', 'JH', 'QD', '8D', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['JS', 'JC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['JS', 'JC'])
        })

        it('trips tied with kicker', () => {
            const hands = [
                ['TC', 'AS'],
                ['TS', '9C']
            ]
            const communityCards = ['TH', 'TD', '3D', 'KD', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['TC', 'AS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['TC', 'AS'])
        })

        it('trips tie', () => {
            const hands = [
                ['TC', '9S'],
                ['TS', '9C']
            ]
            const communityCards = ['TH', 'TD', 'AD', 'KD', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('two pair beats one pair', () => {
            const hands = [
                ['TC', 'QC'],
                ['JS', 'KS']
            ]
            const communityCards = ['TH', 'KD', 'QD', '8H', '6H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['TC', 'QC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['TC', 'QC'])
        })

        it('two pair - high pair wins', () => {
            const hands = [
                ['AC', 'TC'],
                ['JS', 'KS']
            ]
            const communityCards = ['AH', 'JD', 'KD', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AC', 'TC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AC', 'TC'])
        })

        it('two pair - second highest pair wins', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', 'KD', 'QD', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AC', 'KC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AC', 'KC'])
        })

        it('two pair - kicker', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', 'JD', 'JD', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AC', 'KC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AC', 'KC'])
        })

        it('two pair tie', () => {
            const hands = [
                ['AC', 'KC'],
                ['AS', 'KS']
            ]
            const communityCards = ['AH', 'KD', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('high pair wins', () => {
            const hands = [
                ['AS', 'AC'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', 'AC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', 'AC'])
        })

        it('high pair wins - reverse', () => {
            const hands = [
                ['KS', 'KC'],
                ['AS', 'AC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', 'AC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', 'AC'])
        })

        it('high pair - kicker', () => {
            const hands = [
                ['AD', 'KC'],
                ['AS', 'QC']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AD', 'KC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AD', 'KC'])
        })

        it('one pair tie', () => {
            const hands = [
                ['AC', 'QC'],
                ['AS', 'QS']
            ]
            const communityCards = ['AH', '5D', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })

        it('one pair beats high card', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', 'KC']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['KS', 'KC'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['KS', 'KC'])
        })

        it('high card wins', () => {
            const hands = [
                ['AS', '2S'],
                ['KS', '3S']
            ]
            const communityCards = ['4D', '5D', '7D', '8H', 'TH']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', '2S'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', '2S'])
        })

        it('high card - 4 ties in community', () => {
            const hands = [
                ['8S', '2S'],
                ['7S', '3S']
            ]
            const communityCards = ['AD', 'KD', 'JD', 'TH', '4H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['8S', '2S'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['8S', '2S'])
        })

        it('high card - tie in hand', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'QH']
            ]
            const communityCards = ['JD', 'TD', '2D', '6H', '4H']

            expect(determineBetterHand(hands, communityCards)).toEqual(['AS', 'KS'])
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(['AS', 'KS'])
        })

        it('no high card - tie', () => {
            const hands = [
                ['AS', 'KS'],
                ['AC', 'KC']
            ]
            const communityCards = ['JD', 'TD', '2D', '6H', '4H']

            expect(determineBetterHand(hands, communityCards)).toEqual(false)
            expect(determineBetterHand(reverseOrder(hands), communityCards)).toEqual(false)
        })
    })
})
