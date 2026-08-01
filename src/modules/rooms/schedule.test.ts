import { describe, expect, it } from 'vitest'
import {
	formatTimeInTimeZone,
	getBookingSegments,
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
			percentage: 58.333333333333336
		})
	})

	it('positions the current-time line across the browser day', () => {
		const now = new Date('2026-07-30T17:00:00.000Z')

		expect(getCurrentTimeMarker(now, getWeekDays(now))).toEqual({
			dayIndex: 3,
			percentage: 83.33333333333334
		})
	})

	it('shows the same UTC booking in the browser timezone', () => {
		const instant = new Date('2026-07-30T06:00:00.000Z')

		expect(formatTimeInTimeZone(instant, 'Europe/Kyiv')).toBe('09:00')
		expect(formatTimeInTimeZone(instant, 'Europe/Berlin')).toBe('08:00')
	})

	it('places a booking in each local day it crosses', () => {
		const days = getWeekDays(
			new Date('2026-07-30T12:00:00.000Z'),
			0,
			'Pacific/Honolulu'
		)
		const segments = getBookingSegments(
			[
				{
					id: 'booking-1',
					title: 'Нічна зустріч',
					startAt: '2026-07-30T08:00:00.000Z',
					endAt: '2026-07-30T12:00:00.000Z',
					authorName: 'Андрій'
				}
			],
			days,
			'Pacific/Honolulu'
		)

		expect(segments).toHaveLength(2)
		expect(segments.map(segment => segment.dayIndex)).toEqual([2, 3])
	})
})
