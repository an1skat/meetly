import { describe, expect, it } from 'vitest'
import { createBookingSchema } from './schemas'
import {
	hasValidBookingDuration,
	isFutureTime,
	isThirtyMinuteAligned,
	isWithinOfficeHours,
	utcToOfficeTime,
	utcToTimeZone,
	validateBookingTime
} from './time'

describe('booking time validation', () => {
	it('converts a UTC instant to Kyiv and Berlin time', () => {
		const instant = new Date('2026-07-30T06:00:00.000Z')

		expect(utcToOfficeTime(instant)).toMatchObject({
			year: 2026,
			month: 7,
			day: 30,
			hour: 9,
			minute: 0
		})
		expect(utcToTimeZone(instant, 'Europe/Berlin')).toMatchObject({
			hour: 8,
			minute: 0
		})
	})

	it('keeps the Kyiv calendar date across a UTC day boundary', () => {
		expect(utcToOfficeTime(new Date('2026-01-15T22:30:00.000Z'))).toMatchObject(
			{
				year: 2026,
				month: 1,
				day: 16,
				hour: 0,
				minute: 30
			}
		)
	})

	it('uses Kyiv daylight-saving offsets for office hours', () => {
		expect(
			isWithinOfficeHours(
				new Date('2026-01-15T07:00:00.000Z'),
				new Date('2026-01-15T08:00:00.000Z')
			)
		).toBe(true)
		expect(
			isWithinOfficeHours(
				new Date('2026-07-30T06:00:00.000Z'),
				new Date('2026-07-30T07:00:00.000Z')
			)
		).toBe(true)
	})

	it('accepts exactly the beginning and end of the office day', () => {
		const startAt = new Date('2026-07-30T06:00:00.000Z')
		const endAt = new Date('2026-07-30T16:00:00.000Z')

		expect(isThirtyMinuteAligned(startAt)).toBe(true)
		expect(isThirtyMinuteAligned(endAt)).toBe(true)
		expect(isWithinOfficeHours(startAt, endAt)).toBe(true)
		expect(
			isWithinOfficeHours(
				new Date('2026-07-30T15:30:00.000Z'),
				new Date('2026-07-30T16:30:00.000Z')
			)
		).toBe(false)
	})

	it('rejects off-grid, out-of-hours, past, and invalid-duration bookings', () => {
		const now = new Date('2026-07-29T12:00:00.000Z')

		expect(
			validateBookingTime(
				new Date('2026-07-30T06:15:00.000Z'),
				new Date('2026-07-30T07:00:00.000Z'),
				now
			)
		).toBe('slot')
		expect(
			validateBookingTime(
				new Date('2026-07-30T05:30:00.000Z'),
				new Date('2026-07-30T06:30:00.000Z'),
				now
			)
		).toBe('office-hours')
		expect(
			validateBookingTime(
				new Date('2026-07-30T06:00:00.000Z'),
				new Date('2026-07-30T10:30:00.000Z'),
				now
			)
		).toBe('duration')
		expect(
			validateBookingTime(
				new Date('2026-07-28T06:00:00.000Z'),
				new Date('2026-07-28T07:00:00.000Z'),
				now
			)
		).toBe('past')
		expect(isFutureTime(now, now)).toBe(false)
		expect(
			hasValidBookingDuration(
				new Date('2026-07-30T06:00:00.000Z'),
				new Date('2026-07-30T05:30:00.000Z')
			)
		).toBe(false)
	})
})

describe('booking API date schema', () => {
	it('accepts ISO UTC dates and returns Date instances', () => {
		const parsed = createBookingSchema.parse({
			roomId: 'clh4k3j2l0000qwer1234asdf',
			title: '  Планування  ',
			startAt: '2026-07-30T06:00:00.000Z',
			endAt: '2026-07-30T07:00:00.000Z'
		})

		expect(parsed).toMatchObject({ title: 'Планування' })
		expect(parsed.startAt).toBeInstanceOf(Date)
		expect(parsed.startAt.toISOString()).toBe('2026-07-30T06:00:00.000Z')
	})

	it('rejects local and offset date strings', () => {
		const input = {
			roomId: 'clh4k3j2l0000qwer1234asdf',
			title: 'Планування',
			startAt: '2026-07-30T09:00:00+03:00',
			endAt: '2026-07-30T10:00:00'
		}

		expect(createBookingSchema.safeParse(input).success).toBe(false)
	})
})

it('reports an explicit error when start is not before end', () => {
	expect(
		validateBookingTime(
			new Date('2026-07-30T07:00:00.000Z'),
			new Date('2026-07-30T06:30:00.000Z'),
			new Date('2026-07-29T12:00:00.000Z')
		)
	).toBe('order')
})
