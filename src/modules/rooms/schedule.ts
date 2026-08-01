import {
	OFFICE_TIME_ZONE,
	SLOT_MINUTES,
	WORKDAY_END_MINUTES,
	WORKDAY_START_MINUTES
} from '@/modules/bookings/time'

export {
	OFFICE_TIME_ZONE,
	SLOT_MINUTES,
	WORKDAY_END_MINUTES,
	WORKDAY_START_MINUTES
}

const SLOT_COUNT =
	(WORKDAY_END_MINUTES - WORKDAY_START_MINUTES) / SLOT_MINUTES
const DAY_MINUTES = 24 * 60
const DAY_SLOT_COUNT = DAY_MINUTES / SLOT_MINUTES

const officeDateFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: OFFICE_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
})

const officeTimeFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: OFFICE_TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23'
})

const weekdayFormatter = new Intl.DateTimeFormat('uk-UA', {
	timeZone: 'UTC',
	weekday: 'short'
})

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
	timeZone: 'UTC',
	day: 'numeric',
	month: 'short'
})

const weekFormatter = new Intl.DateTimeFormat('uk-UA', {
	timeZone: 'UTC',
	day: 'numeric',
	month: 'short',
	year: 'numeric'
})

export type WeekDay = {
	key: string
	date: Date
	weekdayLabel: string
	dateLabel: string
	isToday: boolean
}

export type ScheduleBooking = {
	id: string
	title: string
	startAt: string
	endAt: string
	authorName: string
}

export type BookingSegment = ScheduleBooking & {
	dayIndex: number
	top: number
	height: number
}

export type CurrentTimeMarker = {
	dayIndex: number
	percentage: number
}

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

function getDateParts(date: Date, timeZone: string) {
	const parts =
		timeZone === OFFICE_TIME_ZONE
			? officeDateFormatter.formatToParts(date)
			: new Intl.DateTimeFormat('en-CA', {
				timeZone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).formatToParts(date)

	return {
		year: getPart(parts, 'year'),
		month: getPart(parts, 'month'),
		day: getPart(parts, 'day')
	}
}

function getTimeParts(date: Date, timeZone: string) {
	const parts =
		timeZone === OFFICE_TIME_ZONE
			? officeTimeFormatter.formatToParts(date)
			: new Intl.DateTimeFormat('en-GB', {
				timeZone,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hourCycle: 'h23'
			}).formatToParts(date)

	return {
		hour: getPart(parts, 'hour'),
		minute: getPart(parts, 'minute'),
		second: getPart(parts, 'second')
	}
}

function formatDateKey(year: number, month: number, day: number) {
	return [
		String(year).padStart(4, '0'),
		String(month).padStart(2, '0'),
		String(day).padStart(2, '0')
	].join('-')
}

function formatMinutes(totalMinutes: number) {
	const hours = Math.floor(totalMinutes / 60)
	const minutes = totalMinutes % 60

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const TIME_LABELS = Array.from(
	{ length: SLOT_COUNT + 1 },
	(_, index) =>
		formatMinutes(WORKDAY_START_MINUTES + index * SLOT_MINUTES)
)

export const TIME_SLOTS = TIME_LABELS.slice(0, -1)

export const DISPLAY_TIME_LABELS = Array.from(
	{ length: DAY_SLOT_COUNT + 1 },
	(_, index) => formatMinutes(index * SLOT_MINUTES)
)

export const DISPLAY_TIME_SLOTS = DISPLAY_TIME_LABELS.slice(0, -1)

export function getOfficeDateKey(date: Date) {
	const { year, month, day } = getDateParts(date, OFFICE_TIME_ZONE)

	return formatDateKey(year, month, day)
}

export function getTimeZoneDateKey(date: Date, timeZone: string) {
	const { year, month, day } = getDateParts(date, timeZone)

	return formatDateKey(year, month, day)
}

export function getWeekDays(
	reference: Date,
	weekOffset = 0,
	timeZone = OFFICE_TIME_ZONE
): WeekDay[] {
	const { year, month, day } = getDateParts(reference, timeZone)
	const todayKey = formatDateKey(year, month, day)
	const officeDate = new Date(Date.UTC(year, month - 1, day))
	const daysSinceMonday = (officeDate.getUTCDay() + 6) % 7
	const monday = new Date(officeDate)

	monday.setUTCDate(
		monday.getUTCDate() - daysSinceMonday + weekOffset * 7
	)

	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(monday)

		date.setUTCDate(monday.getUTCDate() + index)

		const key = formatDateKey(
			date.getUTCFullYear(),
			date.getUTCMonth() + 1,
			date.getUTCDate()
		)

		return {
			key,
			date,
			weekdayLabel: weekdayFormatter.format(date).replace(/\.$/, ''),
			dateLabel: dateFormatter.format(date),
			isToday: key === todayKey
		}
	})
}

export function formatWeekLabel(days: WeekDay[]) {
	const firstDay = days[0]
	const lastDay = days.at(-1)

	if (!firstDay || !lastDay) {
		return ''
	}

	return weekFormatter.formatRange(firstDay.date, lastDay.date)
}

export function formatOfficeTime(date: Date) {
	const { hour, minute } = getTimeParts(date, OFFICE_TIME_ZONE)

	return formatMinutes(hour * 60 + minute)
}

export function formatTimeInTimeZone(date: Date, timeZone: string) {
	const { hour, minute } = getTimeParts(date, timeZone)

	return formatMinutes(hour * 60 + minute)
}

export function getCurrentTimeMarker(
	now: Date,
	days: WeekDay[],
	timeZone = OFFICE_TIME_ZONE
): CurrentTimeMarker | null {
	const dayIndex = days.findIndex(
		day => day.key === getTimeZoneDateKey(now, timeZone)
	)

	if (dayIndex === -1) {
		return null
	}

	const { hour, minute, second } = getTimeParts(now, timeZone)
	const currentMinutes = hour * 60 + minute + second / 60

	return {
		dayIndex,
		percentage: (currentMinutes / DAY_MINUTES) * 100
	}
}

export function getBookingSegments(
	bookings: ScheduleBooking[],
	days: WeekDay[],
	timeZone: string
): BookingSegment[] {
	return bookings.flatMap(booking =>
		days.flatMap((day, dayIndex) => {
			const startAt = new Date(booking.startAt)
			const endAt = new Date(booking.endAt)
			const dayStart = getTimeZoneDayStart(day.date, timeZone)
			const nextDay = new Date(day.date)

			nextDay.setUTCDate(nextDay.getUTCDate() + 1)

			const dayEnd = getTimeZoneDayStart(nextDay, timeZone)
			const segmentStart = new Date(
				Math.max(startAt.getTime(), dayStart.getTime())
			)
			const segmentEnd = new Date(
				Math.min(endAt.getTime(), dayEnd.getTime())
			)

			if (segmentStart >= segmentEnd) {
				return []
			}

			return [
				{
					...booking,
					dayIndex,
					top:
						((segmentStart.getTime() - dayStart.getTime()) /
							(dayEnd.getTime() - dayStart.getTime())) *
						100,
					height:
						((segmentEnd.getTime() - segmentStart.getTime()) /
							(dayEnd.getTime() - dayStart.getTime())) *
						100
				}
			]
		})
	)
}

function getTimeZoneDayStart(date: Date, timeZone: string) {
	const target = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate()
	)
	let value = new Date(target)

	for (let index = 0; index < 2; index += 1) {
		const parts = getDateParts(value, timeZone)
		const time = getTimeParts(value, timeZone)
		const actual = Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			time.hour,
			time.minute,
			time.second
		)

		value = new Date(value.getTime() + target - actual)
	}

	return value
}

export function isOfficeTimeZone(timeZone: string) {
	return timeZone === OFFICE_TIME_ZONE || timeZone === 'Europe/Kiev'
}
