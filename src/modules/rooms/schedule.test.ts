import { describe, expect, it } from 'vitest'
import {
	getCurrentTimeMarker,
	getOfficeDateKey,
	getWeekDays,
	TIME_LABELS,
	TIME_SLOTS
} from './schedule'

describe('room schedule dates', () => {
	it('builds a Monday-to-Sunday week in the office timezone', () => {
		const days = getWeekDays(new Date('2026-07-30T12:00:00.000Z'))

		expect(days.map(day => day.key)).toEqual([
			'2026-07-27',
			'2026-07-28',
			'2026-07-29',
			'2026-07-30',
			'2026-07-31',
			'2026-08-01',
			'2026-08-02'
		])
		expect(days[3]?.isToday).toBe(true)
	})

	it('moves by complete weeks', () => {
		const days = getWeekDays(new Date('2026-07-30T12:00:00.000Z'), 1)

		expect(days[0]?.key).toBe('2026-08-03')
		expect(days[6]?.key).toBe('2026-08-09')
	})

	it('uses the Kyiv calendar date around the UTC day boundary', () => {
		expect(getOfficeDateKey(new Date('2026-07-29T21:30:00.000Z'))).toBe(
			'2026-07-30'
		)
	})

	it('creates 30-minute slots from 09:00 to 19:00', () => {
		expect(TIME_SLOTS).toHaveLength(20)
		expect(TIME_LABELS[0]).toBe('09:00')
		expect(TIME_SLOTS.at(-1)).toBe('18:30')
		expect(TIME_LABELS.at(-1)).toBe('19:00')
	})

	it('positions the current-time line within the current day', () => {
		const now = new Date('2026-07-30T11:00:00.000Z')
		const marker = getCurrentTimeMarker(now, getWeekDays(now))

		expect(marker).toEqual({
			dayIndex: 3,
			percentage: 50
		})
	})

	it('hides the current-time line outside office hours', () => {
		const now = new Date('2026-07-30T17:00:00.000Z')

		expect(getCurrentTimeMarker(now, getWeekDays(now))).toBeNull()
	})
})
