export const OFFICE_TIME_ZONE = 'Europe/Kyiv'
export const WORKDAY_START_MINUTES = 9 * 60
export const WORKDAY_END_MINUTES = 19 * 60
export const SLOT_MINUTES = 30

const SLOT_COUNT =
	(WORKDAY_END_MINUTES - WORKDAY_START_MINUTES) / SLOT_MINUTES

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

function getOfficeDateParts(date: Date) {
	const parts = officeDateFormatter.formatToParts(date)

	return {
		year: getPart(parts, 'year'),
		month: getPart(parts, 'month'),
		day: getPart(parts, 'day')
	}
}

function getOfficeTimeParts(date: Date) {
	const parts = officeTimeFormatter.formatToParts(date)

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

export function getOfficeDateKey(date: Date) {
	const { year, month, day } = getOfficeDateParts(date)

	return formatDateKey(year, month, day)
}

export function getWeekDays(reference: Date, weekOffset = 0): WeekDay[] {
	const { year, month, day } = getOfficeDateParts(reference)
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
	const { hour, minute } = getOfficeTimeParts(date)

	return formatMinutes(hour * 60 + minute)
}

export function getCurrentTimeMarker(
	now: Date,
	days: WeekDay[]
): CurrentTimeMarker | null {
	const dayIndex = days.findIndex(day => day.key === getOfficeDateKey(now))

	if (dayIndex === -1) {
		return null
	}

	const { hour, minute, second } = getOfficeTimeParts(now)
	const currentMinutes = hour * 60 + minute + second / 60

	if (
		currentMinutes < WORKDAY_START_MINUTES ||
		currentMinutes >= WORKDAY_END_MINUTES
	) {
		return null
	}

	return {
		dayIndex,
		percentage:
			((currentMinutes - WORKDAY_START_MINUTES) /
				(WORKDAY_END_MINUTES - WORKDAY_START_MINUTES)) *
			100
	}
}

export function isOfficeTimeZone(timeZone: string) {
	return timeZone === OFFICE_TIME_ZONE || timeZone === 'Europe/Kiev'
}
