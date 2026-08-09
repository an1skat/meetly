'use client'

import { intervalsOverlap, SLOT_MINUTES } from '@/modules/bookings/time'
import Link from 'next/link'
import { useState, type KeyboardEvent } from 'react'
import {
	DISPLAY_TIME_LABELS,
	formatTimeInTimeZone,
	getBookingSegments,
	getCurrentTimeMarker,
	getScheduleSlots,
	type BookingSegment,
	type ScheduleBooking,
	type WeekDay
} from '../schedule'

type WeekGridProps = {
	bookings: ScheduleBooking[]
	days: WeekDay[]
	emphasizeOwnBookings: boolean
	now: Date
	timeZone: string
	onSelectSlot: (startAt: Date) => void
}

const DESKTOP_SLOT_HEIGHT = 36
const MOBILE_SLOT_HEIGHT = 48
const DAY_MINUTES = 24 * 60

type LaidOutBookingSegment = BookingSegment & {
	columnIndex: number
	columnCount: number
}

type SlotNavigationKey =
	| 'ArrowDown'
	| 'ArrowLeft'
	| 'ArrowRight'
	| 'ArrowUp'
	| 'End'
	| 'Home'

const slotNavigationKeys = new Set<string>([
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'End',
	'Home'
])

function isSlotNavigationKey(key: string): key is SlotNavigationKey {
	return slotNavigationKeys.has(key)
}

function getSlotKey(slot: Pick<BookingSegment, 'dayIndex' | 'startAt'>) {
	return `${slot.dayIndex}-${slot.startAt}`
}

export function getNextSlotIndex(
	slots: Pick<BookingSegment, 'dayIndex' | 'top'>[],
	currentIndex: number,
	key: SlotNavigationKey
) {
	const currentSlot = slots[currentIndex]

	if (!currentSlot) {
		return currentIndex
	}

	const sameDayIndexes = slots
		.map((slot, index) => ({ index, slot }))
		.filter(({ slot }) => slot.dayIndex === currentSlot.dayIndex)
		.toSorted((a, b) => a.slot.top - b.slot.top)
		.map(({ index }) => index)

	if (key === 'Home') {
		return sameDayIndexes[0] ?? currentIndex
	}

	if (key === 'End') {
		return sameDayIndexes.at(-1) ?? currentIndex
	}

	if (key === 'ArrowUp' || key === 'ArrowDown') {
		const position = sameDayIndexes.indexOf(currentIndex)
		const offset = key === 'ArrowUp' ? -1 : 1

		return sameDayIndexes[position + offset] ?? currentIndex
	}

	const targetDayIndex =
		currentSlot.dayIndex + (key === 'ArrowLeft' ? -1 : 1)
	const targetDayIndexes = slots
		.map((slot, index) => ({ index, slot }))
		.filter(({ slot }) => slot.dayIndex === targetDayIndex)

	return (
		targetDayIndexes.toSorted(
			(a, b) =>
				Math.abs(a.slot.top - currentSlot.top) -
				Math.abs(b.slot.top - currentSlot.top)
		)[0]?.index ?? currentIndex
	)
}

export function isCompactBookingSegment(
	segment: Pick<BookingSegment, 'height'>,
	slotCount: number
) {
	return segment.height <= 100 / slotCount + 0.001
}

function fitSegmentsToRange<T extends { top: number; height: number }>(
	segments: T[],
	rangeStart: number,
	rangeHeight: number
) {
	const rangeEnd = rangeStart + rangeHeight

	return segments.flatMap(segment => {
		const start = Math.max(segment.top, rangeStart)
		const end = Math.min(segment.top + segment.height, rangeEnd)

		if (start >= end) {
			return []
		}

		return [
			{
				...segment,
				top: ((start - rangeStart) / rangeHeight) * 100,
				height: ((end - start) / rangeHeight) * 100
			}
		]
	})
}

export function layoutBookingSegments(
	segments: BookingSegment[]
): LaidOutBookingSegment[] {
	const result: LaidOutBookingSegment[] = []
	const segmentsByDay = new Map<number, BookingSegment[]>()

	for (const segment of segments) {
		const daySegments = segmentsByDay.get(segment.dayIndex) ?? []

		daySegments.push(segment)
		segmentsByDay.set(segment.dayIndex, daySegments)
	}

	for (const daySegments of segmentsByDay.values()) {
		const sorted = daySegments.toSorted(
			(a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
		)
		let cluster: BookingSegment[] = []
		let clusterEnd = Number.NEGATIVE_INFINITY

		const flushCluster = () => {
			const columnEnds: number[] = []
			const placements = cluster.map(segment => {
				const start = new Date(segment.startAt).getTime()
				const end = new Date(segment.endAt).getTime()
				let columnIndex = columnEnds.findIndex(columnEnd => columnEnd <= start)

				if (columnIndex === -1) {
					columnIndex = columnEnds.length
					columnEnds.push(end)
				} else {
					columnEnds[columnIndex] = end
				}

				return { segment, columnIndex }
			})

			for (const placement of placements) {
				result.push({
					...placement.segment,
					columnIndex: placement.columnIndex,
					columnCount: columnEnds.length
				})
			}
		}

		for (const segment of sorted) {
			const start = new Date(segment.startAt).getTime()
			const end = new Date(segment.endAt).getTime()

			if (cluster.length > 0 && start >= clusterEnd) {
				flushCluster()
				cluster = []
				clusterEnd = Number.NEGATIVE_INFINITY
			}

			cluster.push(segment)
			clusterEnd = Math.max(clusterEnd, end)
		}

		flushCluster()
	}

	return result
}

export function getInitialMobileDayIndex(days: WeekDay[]) {
	const todayIndex = days.findIndex(day => day.isToday)

	return todayIndex >= 0 ? todayIndex : 0
}

export function WeekGrid({
	bookings,
	days,
	emphasizeOwnBookings,
	now,
	timeZone,
	onSelectSlot
}: WeekGridProps) {
	const [mobileDayKey, setMobileDayKey] = useState(
		() => days[getInitialMobileDayIndex(days)]?.key ?? ''
	)
	const [focusedSlotKey, setFocusedSlotKey] = useState<string | null>(null)
	const marker = getCurrentTimeMarker(now, days, timeZone)
	const rawBookingSegments = getBookingSegments(bookings, days, timeZone)
	const { bookableSlots, displayRange } = getScheduleSlots(days, timeZone, now)
	const rawFreeSlotSegments = bookableSlots.filter(
		slot =>
			!bookings.some(booking =>
				intervalsOverlap(
					new Date(slot.startAt),
					new Date(slot.endAt),
					new Date(booking.startAt),
					new Date(booking.endAt)
				)
			)
	)
	const { startMinutes, endMinutes } = displayRange
	const rangeStart = (startMinutes / DAY_MINUTES) * 100
	const rangeHeight = ((endMinutes - startMinutes) / DAY_MINUTES) * 100
	const bookingSegments = layoutBookingSegments(
		fitSegmentsToRange(rawBookingSegments, rangeStart, rangeHeight)
	)
	const freeSlotSegments = fitSegmentsToRange(
		rawFreeSlotSegments,
		rangeStart,
		rangeHeight
	)
	const timeLabels = DISPLAY_TIME_LABELS.slice(
		startMinutes / SLOT_MINUTES,
		endMinutes / SLOT_MINUTES + 1
	)
	const timeSlots = timeLabels.slice(0, -1)
	const bookableSlotKeys = new Set(
		bookableSlots.map(
			segment =>
				`${segment.dayIndex}-${formatTimeInTimeZone(new Date(segment.startAt), timeZone)}`
		)
	)
	const currentMarker =
		marker &&
		marker.percentage >= rangeStart &&
		marker.percentage <= rangeStart + rangeHeight
			? {
					...marker,
					percentage: ((marker.percentage - rangeStart) / rangeHeight) * 100
				}
			: null
	const fallbackMobileDayIndex = getInitialMobileDayIndex(days)
	const storedMobileDayIndex = days.findIndex(day => day.key === mobileDayKey)
	const mobileDayIndex =
		storedMobileDayIndex >= 0 ? storedMobileDayIndex : fallbackMobileDayIndex
	const mobileDay = days[mobileDayIndex]
	const allDayIndexes = days.map((_, index) => index)

	const renderTimeline = (
		visibleDayIndexes: number[],
		slotHeight: number,
		isMobile: boolean
	) => {
		const dayPositions = new Map(
			visibleDayIndexes.map((dayIndex, position) => [dayIndex, position])
		)
		const dayCount = visibleDayIndexes.length
		const gridHeight = timeSlots.length * slotHeight
		const getSlotColor = (dayIndex: number, slot: string) =>
			bookableSlotKeys.has(`${dayIndex}-${slot}`)
				? 'bg-lime-soft/35'
				: 'bg-canvas/65'
		const visibleFreeSlots = freeSlotSegments.filter(segment =>
			dayPositions.has(segment.dayIndex)
		)
		const fallbackFocusableSlotKey = visibleFreeSlots[0]
			? getSlotKey(visibleFreeSlots[0])
			: null
		const focusableSlotKey = visibleFreeSlots.some(
			segment => getSlotKey(segment) === focusedSlotKey
		)
			? focusedSlotKey
			: fallbackFocusableSlotKey
		const visibleBookings = bookingSegments.filter(segment =>
			dayPositions.has(segment.dayIndex)
		)
		const visibleMarker =
			currentMarker && dayPositions.has(currentMarker.dayIndex)
				? currentMarker
				: null

		return (
			<div className="grid grid-cols-[4rem_minmax(0,1fr)] lg:grid-cols-[4.5rem_minmax(0,1fr)]">
				<div
					className="relative border-r border-line bg-canvas/45"
					style={{ height: gridHeight }}
				>
					{timeLabels.map((label, index) => (
						<span
							key={label}
							className={`absolute right-2 z-10 text-[10px] leading-none tabular-nums text-muted lg:right-3 ${
								index === 0
									? 'translate-y-1'
									: index === timeLabels.length - 1
										? '-translate-y-[calc(100%+4px)]'
										: '-translate-y-1/2'
							}`}
							style={{ top: index * slotHeight }}
						>
							{label}
						</span>
					))}
				</div>

				<div
					className="relative min-w-0"
					style={{ height: gridHeight }}
				>
					<div
						className="absolute inset-x-0 grid border-t border-line/70"
						style={{
							top: 0,
							height: gridHeight,
							gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`
						}}
					>
						{timeSlots.flatMap(slot =>
							visibleDayIndexes.map(dayIndex => {
								const day = days[dayIndex]
								return (
									<div
										key={`${day?.key}-${slot}`}
										className={`border-r border-b border-line/70 last:border-r-0 ${getSlotColor(dayIndex, slot)}`}
										style={{ height: slotHeight }}
									/>
								)
							})
						)}

						{visibleFreeSlots.map((segment, slotIndex) => {
							const day = days[segment.dayIndex]
							const dayPosition = dayPositions.get(segment.dayIndex) ?? 0
							const slotKey = getSlotKey(segment)
							const time = formatTimeInTimeZone(
								new Date(segment.startAt),
								timeZone
							)
							const label = `Створити бронювання: ${day?.weekdayLabel}, ${day?.dateLabel}, ${time}`

							return (
								<button
									key={`${segment.id}-${segment.dayIndex}`}
									type="button"
									aria-label={label}
									aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End"
									data-slot-key={slotKey}
									tabIndex={slotKey === focusableSlotKey ? 0 : -1}
									className="group absolute z-1 flex touch-manipulation items-center justify-center rounded-lg bg-transparent text-lime outline-none transition-colors hover:bg-lime/15 active:bg-lime/20 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
									style={{
										top: `${segment.top}%`,
										left: `${(dayPosition / dayCount) * 100}%`,
										width: `${100 / dayCount}%`,
										height: `${segment.height}%`
									}}
									title={label}
									onFocus={() => setFocusedSlotKey(slotKey)}
									onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
										if (!isSlotNavigationKey(event.key)) {
											return
										}

										event.preventDefault()

										const nextSlotIndex = getNextSlotIndex(
											visibleFreeSlots,
											slotIndex,
											event.key
										)
										const nextSlot = visibleFreeSlots[nextSlotIndex]

										if (!nextSlot || nextSlotIndex === slotIndex) {
											return
										}

										const nextSlotKey = getSlotKey(nextSlot)

										setFocusedSlotKey(nextSlotKey)
										event.currentTarget.parentElement
											?.querySelector<HTMLButtonElement>(
												`[data-slot-key="${nextSlotKey}"]`
											)
											?.focus()
									}}
									onClick={() => onSelectSlot(new Date(segment.startAt))}
								>
									<span
										aria-hidden="true"
										className={`grid h-6 w-6 place-items-center rounded-full border border-lime/30 bg-lime-soft/70 text-sm font-bold transition-opacity ${
											isMobile
												? 'opacity-60'
												: 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
										}`}
									>
										+
									</span>
								</button>
							)
						})}

						{visibleBookings.map(segment => {
							const dayPosition = dayPositions.get(segment.dayIndex) ?? 0
							const dayWidth = 100 / dayCount
							const isPast = new Date(segment.endAt) <= now
							const isCompact = isCompactBookingSegment(
								segment,
								timeSlots.length
							)
							const startLabel = formatTimeInTimeZone(
								new Date(segment.startAt),
								timeZone
							)
							const endLabel = formatTimeInTimeZone(
								new Date(segment.endAt),
								timeZone
							)
							const ownerLabel = segment.isOwn
								? 'ваше бронювання'
								: segment.authorName
							const bookingTitle = `${segment.title}: ${startLabel}–${endLabel} · ${ownerLabel}`
							const bookingClassName = `absolute z-10 overflow-hidden rounded-lg border px-2 text-xs shadow-sm ${isCompact ? 'flex items-center py-1' : 'py-1.5'} ${
								segment.isOwn
									? 'border-lime/50 bg-lime text-lime-ink outline-none focus-visible:ring-2 focus-visible:ring-lime-ink'
									: 'border-grape/15 bg-grape-soft text-grape'
							} ${isPast ? 'border-dashed saturate-50' : ''} ${
								emphasizeOwnBookings && segment.isOwn
									? 'ring-2 ring-inset ring-lime-ink/35'
									: ''
							}`
							const bookingStyle = {
								top: `${segment.top}%`,
								left: `${dayWidth * dayPosition + (dayWidth * segment.columnIndex) / segment.columnCount}%`,
								width: `${dayWidth / segment.columnCount}%`,
								height: `${segment.height}%`
							}
							const bookingContent = (
								<>
									<span className="block min-w-0 truncate font-semibold">
										{segment.title}
									</span>
									{isCompact ? (
										<span className="sr-only">
											{startLabel}–{endLabel}, {ownerLabel}
										</span>
									) : (
										<>
											<span className="mt-1 block truncate text-xs opacity-80">
												{startLabel}–{endLabel}
											</span>
											<span className="mt-1 block truncate text-xs opacity-80">
												{segment.isOwn
													? 'Ваше бронювання'
													: segment.authorName}
											</span>
										</>
									)}
								</>
							)

							if (segment.isOwn) {
								const bookingType = isPast ? 'past' : 'upcoming'

								return (
									<Link
										key={`${segment.id}-${segment.dayIndex}`}
										href={`/my-bookings?type=${bookingType}&booking=${encodeURIComponent(segment.id)}`}
										aria-label={`Відкрити бронювання «${segment.title}» у моїх бронюваннях`}
										className={bookingClassName}
										style={bookingStyle}
										title={`${bookingTitle}. Відкрити в моїх бронюваннях`}
									>
										{bookingContent}
									</Link>
								)
							}

							return (
								<div
									key={`${segment.id}-${segment.dayIndex}`}
									className={bookingClassName}
									style={bookingStyle}
									title={bookingTitle}
								>
									{bookingContent}
								</div>
							)
						})}

						{visibleMarker && (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute z-20 h-px bg-coral"
								style={{
									top: `${visibleMarker.percentage}%`,
									left: `${((dayPositions.get(visibleMarker.dayIndex) ?? 0) / dayCount) * 100}%`,
									width: `${100 / dayCount}%`
								}}
							>
								<span className="absolute -left-1 -top-0.75 h-2 w-2 rounded-full bg-coral" />
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-line bg-raised">
			<div className="hidden grid-cols-[4.5rem_1fr] border-b border-line lg:grid">
				<div className="flex items-center justify-end bg-canvas/45 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
					Час
				</div>

				<div className="grid grid-cols-7">
					{days.map(day => (
						<div
							key={day.key}
							className={`border-l border-line px-2 py-3 text-center ${
								day.isToday
									? 'bg-lime-soft text-lime'
									: day.isPast
										? 'bg-canvas/55 text-muted/55'
										: 'text-ink'
							}`}
						>
							<span className="block text-xs font-semibold uppercase tracking-[0.12em]">
								{day.weekdayLabel}
							</span>
							<span className="mt-1 block text-sm font-bold">
								{day.dateLabel}
							</span>
							{day.isPast && <span className="sr-only">Минулий день</span>}
							{day.isToday && <span className="sr-only">Сьогодні</span>}
						</div>
					))}
				</div>
			</div>

			<div className="bg-canvas/35 p-2 lg:hidden">
				<nav
					aria-label="Навігація за днями"
					className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2"
				>
					<button
						type="button"
						aria-label="Попередній день"
						disabled={mobileDayIndex === 0}
						className="grid h-12 w-12 touch-manipulation place-items-center rounded-xl bg-raised text-lg text-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-25"
						onClick={() =>
							setMobileDayKey(days[mobileDayIndex - 1]?.key ?? mobileDayKey)
						}
					>
						←
					</button>

					<div className="min-w-0 text-center">
						<p className="truncate text-sm font-bold capitalize text-ink">
							{mobileDay?.weekdayLabel}, {mobileDay?.dateLabel}
						</p>
						<p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
							{mobileDay?.isToday
								? 'Сьогодні'
								: `День ${mobileDayIndex + 1} із ${days.length}`}
						</p>
					</div>

					<button
						type="button"
						aria-label="Наступний день"
						disabled={mobileDayIndex === days.length - 1}
						className="grid h-12 w-12 touch-manipulation place-items-center rounded-xl bg-raised text-lg text-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-25"
						onClick={() =>
							setMobileDayKey(days[mobileDayIndex + 1]?.key ?? mobileDayKey)
						}
					>
						→
					</button>
				</nav>
			</div>

			<div className="hidden lg:block">
				{renderTimeline(allDayIndexes, DESKTOP_SLOT_HEIGHT, false)}
			</div>
			<div className="lg:hidden">
				{renderTimeline([mobileDayIndex], MOBILE_SLOT_HEIGHT, true)}
			</div>
		</div>
	)
}
