import { describe, expect, it } from 'vitest'
import { getBookingSlotStarts } from './slots'

describe('getBookingSlotStarts', () => {
	it('creates half-hour slots and excludes the booking end', () => {
		const slots = getBookingSlotStarts(
			new Date('2026-07-30T07:00:00.000Z'),
			new Date('2026-07-30T08:30:00.000Z')
		)

		expect(slots.map(slot => slot.toISOString())).toEqual([
			'2026-07-30T07:00:00.000Z',
			'2026-07-30T07:30:00.000Z',
			'2026-07-30T08:00:00.000Z'
		])
	})
})
