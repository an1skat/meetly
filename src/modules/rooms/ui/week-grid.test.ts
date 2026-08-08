import { describe, expect, it } from 'vitest'
import type { BookingSegment } from '../schedule'
import { layoutBookingSegments } from './week-grid'

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
