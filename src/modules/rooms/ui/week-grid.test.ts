import { describe, expect, it } from 'vitest'
import type { BookingSegment, WeekDay } from '../schedule'
import {
	getInitialMobileDayIndex,
	getNextSlotIndex,
	isCompactBookingSegment,
	layoutBookingSegments
} from './week-grid'

function segment(
	id: string,
	startAt: string,
	endAt: string,
	top: number,
	height: number
): BookingSegment {
	return {
		id,
		title: id,
		startAt,
		endAt,
		authorName: 'Автор',
		isOwn: false,
		recurringSeriesId: null,
		dayIndex: 0,
		top,
		height
	}
}

describe('layoutBookingSegments', () => {
	it('splits overlapping cards into columns without shrinking adjacent cards', () => {
		const result = layoutBookingSegments([
			segment(
				'a',
				'2026-08-03T07:00:00.000Z',
				'2026-08-03T08:00:00.000Z',
				0,
				10
			),
			segment(
				'b',
				'2026-08-03T07:30:00.000Z',
				'2026-08-03T08:30:00.000Z',
				5,
				10
			),
			segment(
				'c',
				'2026-08-03T08:30:00.000Z',
				'2026-08-03T09:00:00.000Z',
				15,
				5
			)
		])

		expect(
			result.map(({ id, columnIndex, columnCount }) => ({
				id,
				columnIndex,
				columnCount
			}))
		).toEqual([
			{ id: 'a', columnIndex: 0, columnCount: 2 },
			{ id: 'b', columnIndex: 1, columnCount: 2 },
			{ id: 'c', columnIndex: 0, columnCount: 1 }
		])
	})
})

describe('getInitialMobileDayIndex', () => {
	const day = (key: string, isToday = false): WeekDay => ({
		key,
		date: new Date(`${key}T00:00:00.000Z`),
		weekdayLabel: key,
		dateLabel: key,
		isPast: false,
		isToday
	})

	it('opens today and falls back to the first day on another week', () => {
		expect(
			getInitialMobileDayIndex([
				day('2026-08-03'),
				day('2026-08-04'),
				day('2026-08-05', true)
			])
		).toBe(2)
		expect(
			getInitialMobileDayIndex([day('2026-08-10'), day('2026-08-11')])
		).toBe(0)
	})
})

describe('slot keyboard navigation', () => {
	const slots = [
		{ dayIndex: 0, top: 10 },
		{ dayIndex: 0, top: 20 },
		{ dayIndex: 1, top: 12 },
		{ dayIndex: 1, top: 30 }
	]

	it('moves by time within a day and by the closest time across days', () => {
		expect(getNextSlotIndex(slots, 0, 'ArrowDown')).toBe(1)
		expect(getNextSlotIndex(slots, 1, 'ArrowUp')).toBe(0)
		expect(getNextSlotIndex(slots, 1, 'ArrowRight')).toBe(2)
		expect(getNextSlotIndex(slots, 2, 'ArrowLeft')).toBe(0)
		expect(getNextSlotIndex(slots, 3, 'Home')).toBe(2)
		expect(getNextSlotIndex(slots, 2, 'End')).toBe(3)
	})
})

describe('compact booking cards', () => {
	it('uses the compact layout only for a single 30-minute slot', () => {
		expect(isCompactBookingSegment({ height: 5 }, 20)).toBe(true)
		expect(isCompactBookingSegment({ height: 10 }, 20)).toBe(false)
	})
})
