export const OFFICE_TIME_ZONE = 'Europe/Kyiv'
export const WORKDAY_START_MINUTES = 9 * 60
export const WORKDAY_END_MINUTES = 19 * 60
export const SLOT_MINUTES = 30
export const MIN_BOOKING_MINUTES = SLOT_MINUTES
export const MAX_BOOKING_MINUTES = 4 * 60

export type ZonedTime = {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
}

const officeTimeFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: OFFICE_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23'
})

function getPart(
	parts: Intl.DateTimeFormatPart[],
	type: Intl.DateTimeFormatPartTypes
) {
	const value = parts.find(part => part.type === type)?.value

	if (!value) {
		throw new Error(`Missing ${type} date part`)
	}

	return Number(value)
}

function toZonedTime(
	date: Date,
	formatter: Intl.DateTimeFormat
): ZonedTime {
	const parts = formatter.formatToParts(date)

	return {
		year: getPart(parts, 'year'),
		month: getPart(parts, 'month'),
		day: getPart(parts, 'day'),
		hour: getPart(parts, 'hour'),
		minute: getPart(parts, 'minute'),
		second: getPart(parts, 'second')
	}
}

export function utcToTimeZone(date: Date, timeZone: string): ZonedTime {
	return toZonedTime(
		date,
		new Intl.DateTimeFormat('en-GB', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		})
	)
}

export function utcToOfficeTime(date: Date): ZonedTime {
	return toZonedTime(date, officeTimeFormatter)
}

function toMinutes(time: ZonedTime) {
	return time.hour * 60 + time.minute
}

function isSameOfficeDate(startAt: Date, endAt: Date) {
	const start = utcToOfficeTime(startAt)
	const end = utcToOfficeTime(endAt)

	return (
		start.year === end.year &&
		start.month === end.month &&
		start.day === end.day
	)
}

export function isThirtyMinuteAligned(date: Date) {
	const time = utcToOfficeTime(date)

	return time.minute % SLOT_MINUTES === 0 && time.second === 0 && date.getUTCMilliseconds() === 0
}

export function isWithinOfficeHours(startAt: Date, endAt: Date) {
	if (startAt >= endAt || !isSameOfficeDate(startAt, endAt)) {
		return false
	}

	return (
		toMinutes(utcToOfficeTime(startAt)) >= WORKDAY_START_MINUTES &&
		toMinutes(utcToOfficeTime(endAt)) <= WORKDAY_END_MINUTES
	)
}

export function isFutureTime(date: Date, now = new Date()) {
	return date.getTime() > now.getTime()
}

export function hasValidBookingDuration(startAt: Date, endAt: Date) {
	const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60_000

	return (
		durationMinutes >= MIN_BOOKING_MINUTES &&
		durationMinutes <= MAX_BOOKING_MINUTES
	)
}

export function doBookingTimesOverlap(
	startA: Date,
	endA: Date,
	startB: Date,
	endB: Date
) {
	if (startA >= endA || startB >= endB) {
		return false
	}

	return startA < endB && startB < endA
}

export function getAvailableBookingDurations(
	startAt: Date,
	bookings: Array<{ startAt: Date; endAt: Date }>
) {
	return Array.from(
		{ length: MAX_BOOKING_MINUTES / SLOT_MINUTES },
		(_, index) => (index + 1) * SLOT_MINUTES
	).filter(durationMinutes => {
		const endAt = new Date(startAt.getTime() + durationMinutes * 60_000)

		return (
			validateBookingTime(
				startAt,
				endAt,
				new Date(startAt.getTime() - 1)
			) === null &&
			!bookings.some(booking =>
				doBookingTimesOverlap(
					startAt,
					endAt,
					booking.startAt,
					booking.endAt
				)
			)
		)
	})
}

export type BookingTimeValidationError =
	| 'order'
	| 'slot'
	| 'duration'
	| 'office-hours'
	| 'past'

export function validateBookingTime(
	startAt: Date,
	endAt: Date,
	now = new Date()
): BookingTimeValidationError | null {
	if (startAt >= endAt) {
		return 'order'
	}

	if (!isThirtyMinuteAligned(startAt) || !isThirtyMinuteAligned(endAt)) {
		return 'slot'
	}

	if (!hasValidBookingDuration(startAt, endAt)) {
		return 'duration'
	}

	if (!isWithinOfficeHours(startAt, endAt)) {
		return 'office-hours'
	}

	return isFutureTime(startAt, now) ? null : 'past'
}
