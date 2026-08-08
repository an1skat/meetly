import {
	OFFICE_TIME_ZONE,
	SLOT_MINUTES,
	validateBookingTime,
	zonedTimeToUtc,
	WORKDAY_END_MINUTES,
	WORKDAY_START_MINUTES
} from '@/modules/bookings/time'

export {
	OFFICE_TIME_ZONE,
	SLOT_MINUTES,
	WORKDAY_END_MINUTES,
	WORKDAY_START_MINUTES
}

const SLOT_COUNT = (WORKDAY_END_MINUTES - WORKDAY_START_MINUTES) / SLOT_MINUTES
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

const dateFormatters = new Map<string, Intl.DateTimeFormat>()
const timeFormatters = new Map<string, Intl.DateTimeFormat>()

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
	isPast: boolean
	isToday: boolean
}

export type ScheduleBooking = {
	id: string
	title: string
	startAt: string
	endAt: string
	authorName: string
	isOwn: boolean
	recurringSeriesId: string | null
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
	let formatter = dateFormatters.get(timeZone)

	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
		dateFormatters.set(timeZone, formatter)
	}

	const parts =
		timeZone === OFFICE_TIME_ZONE
			? officeDateFormatter.formatToParts(date)
			: formatter.formatToParts(date)

	return {
		year: getPart(parts, 'year'),
		month: getPart(parts, 'month'),
		day: getPart(parts, 'day')
	}
}

function getTimeParts(date: Date, timeZone: string) {
	let formatter = timeFormatters.get(timeZone)

	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-GB', {
			timeZone,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		})
		timeFormatters.set(timeZone, formatter)
	}

	const parts =
		timeZone === OFFICE_TIME_ZONE
			? officeTimeFormatter.formatToParts(date)
			: formatter.formatToParts(date)

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

export const TIME_LABELS = Array.from({ length: SLOT_COUNT + 1 }, (_, index) =>
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

	monday.setUTCDate(monday.getUTCDate() - daysSinceMonday + weekOffset * 7)

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
			isPast: key < todayKey,
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

	return weekFormatter
		.formatRange(firstDay.date, lastDay.date)
		.replace(/\s+/g, ' ')
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
			const segmentEnd = new Date(Math.min(endAt.getTime(), dayEnd.getTime()))

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

export function getScheduleSlots(days: WeekDay[], timeZone: string, now: Date) {
	const slots = getOfficeSlotSegments(days, timeZone)

	return {
		bookableSlots: slots.filter(segment => new Date(segment.startAt) > now),
		displayRange: getScheduleDisplayRange(slots)
	}
}

function getScheduleDisplayRange(segments: BookingSegment[]) {
	if (segments.length === 0) {
		return { startMinutes: 0, endMinutes: DAY_MINUTES }
	}

	const firstMinute =
		(Math.min(...segments.map(segment => segment.top)) / 100) * DAY_MINUTES
	const lastMinute =
		(Math.max(...segments.map(segment => segment.top + segment.height)) / 100) *
		DAY_MINUTES
	const roundedFirstMinute = Math.round(firstMinute * 1_000) / 1_000
	const roundedLastMinute = Math.round(lastMinute * 1_000) / 1_000

	return {
		startMinutes: Math.max(
			0,
			Math.floor(roundedFirstMinute / SLOT_MINUTES) * SLOT_MINUTES
		),
		endMinutes: Math.min(
			DAY_MINUTES,
			Math.ceil(roundedLastMinute / SLOT_MINUTES) * SLOT_MINUTES
		)
	}
}

function getOfficeSlotSegments(days: WeekDay[], timeZone: string) {
	const firstDay = days[0]
	const lastDay = days.at(-1)

	if (!firstDay || !lastDay) {
		return []
	}

	const visibleStart = getTimeZoneDayStart(firstDay.date, timeZone)
	const dayAfterLast = new Date(lastDay.date)

	dayAfterLast.setUTCDate(dayAfterLast.getUTCDate() + 1)

	const visibleEnd = getTimeZoneDayStart(dayAfterLast, timeZone)
	const slotMilliseconds = SLOT_MINUTES * 60_000
	const firstSlot =
		Math.floor(visibleStart.getTime() / slotMilliseconds) * slotMilliseconds
	const slots: ScheduleBooking[] = []

	for (
		let startTime = firstSlot;
		startTime < visibleEnd.getTime();
		startTime += slotMilliseconds
	) {
		const startAt = new Date(startTime)
		const endAt = new Date(startTime + slotMilliseconds)

		if (
			validateBookingTime(startAt, endAt, new Date(startAt.getTime() - 1)) ===
			null
		) {
			slots.push({
				id: startAt.toISOString(),
				title: '',
				startAt: startAt.toISOString(),
				endAt: endAt.toISOString(),
				authorName: '',
				isOwn: false,
				recurringSeriesId: null
			})
		}
	}

	return getBookingSegments(slots, days, timeZone)
}

export function getTimeZoneDayStart(date: Date, timeZone: string) {
	return zonedTimeToUtc(
		{
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: 0,
			minute: 0,
			second: 0
		},
		timeZone
	)
}

export function isOfficeTimeZone(timeZone: string) {
	return timeZone === OFFICE_TIME_ZONE || timeZone === 'Europe/Kiev'
}

export function getWeekOffset(
	reference: Date,
	target: Date,
	timeZone = OFFICE_TIME_ZONE
) {
	const referenceMonday = getWeekDays(reference, 0, timeZone)[0]?.date
	const targetMonday = getWeekDays(target, 0, timeZone)[0]?.date

	if (!referenceMonday || !targetMonday) {
		return 0
	}

	const weekMilliseconds = 7 * 24 * 60 * 60 * 1000

	return Math.round(
		(targetMonday.getTime() - referenceMonday.getTime()) / weekMilliseconds
	)
}
