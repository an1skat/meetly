'use client'

import { intervalsOverlap, SLOT_MINUTES } from '@/modules/bookings/time'
import { useEffect, useRef } from 'react'
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
	now: Date
	timeZone: string
	onCancelBooking: (
		booking: Pick<
			ScheduleBooking,
			'id' | 'title' | 'recurringSeriesId'
		>
	) => void
	onSelectSlot: (startAt: Date) => void
}

const SLOT_HEIGHT = 40
const DAY_MINUTES = 24 * 60

type LaidOutBookingSegment = BookingSegment & {
	columnIndex: number
	columnCount: number
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

export function WeekGrid({
	bookings,
	days,
	now,
	timeZone,
	onCancelBooking,
	onSelectSlot
}: WeekGridProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const lastAutoScrollKeyRef = useRef('')
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
	const currentMarker =
		marker &&
		marker.percentage >= rangeStart &&
		marker.percentage <= rangeStart + rangeHeight
			? {
					...marker,
					percentage: ((marker.percentage - rangeStart) / rangeHeight) * 100
				}
			: null
	const gridHeight = timeSlots.length * SLOT_HEIGHT
	const scrollTarget =
		freeSlotSegments[0]?.top ??
		currentMarker?.percentage ??
		bookingSegments[0]?.top ??
		0
	const autoScrollKey = `${days[0]?.key ?? ''}-${timeZone}-${startMinutes}-${endMinutes}`

	useEffect(() => {
		if (lastAutoScrollKeyRef.current === autoScrollKey) {
			return
		}

		lastAutoScrollKeyRef.current = autoScrollKey

		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = Math.max(
				0,
				(scrollTarget / 100) * gridHeight - SLOT_HEIGHT * 3
			)
		}
	}, [autoScrollKey, gridHeight, scrollTarget])

	return (
		<div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
			<div className="min-w-220">
				<div className="grid grid-cols-[5rem_1fr] border-b border-zinc-200">
					<div className="flex items-center justify-end bg-zinc-50 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
						Час
					</div>

					<div className="grid grid-cols-7">
						{days.map(day => (
							<div
								key={day.key}
								className={`border-l border-zinc-200 px-2 py-3 text-center ${
									day.isToday
										? 'bg-blue-50 text-blue-900'
										: day.isPast
											? 'bg-zinc-100 text-zinc-400'
											: ''
								}`}
							>
								<span className="block text-xs font-medium uppercase tracking-wide">
									{day.weekdayLabel}
								</span>
								<span className="mt-1 block text-sm font-semibold">
									{day.dateLabel}
								</span>
								{day.isPast && <span className="sr-only">Минулий день</span>}
								{day.isToday && <span className="sr-only">Сьогодні</span>}
							</div>
						))}
					</div>
				</div>

				<div
					ref={scrollContainerRef}
					className="grid max-h-144 grid-cols-[5rem_1fr] overflow-y-auto"
				>
					<div
						className="relative border-r border-zinc-200 bg-zinc-50"
						style={{ height: gridHeight }}
					>
						{timeLabels.map((label, index) => (
							<span
								key={label}
								className={`absolute right-3 text-xs tabular-nums text-zinc-500 ${
									index === 0
										? 'translate-y-1'
										: index === timeLabels.length - 1
											? '-translate-y-full'
											: '-translate-y-1/2'
								}`}
								style={{ top: `${(index / timeSlots.length) * 100}%` }}
							>
								{label}
							</span>
						))}
					</div>

					<div
						className="relative grid grid-cols-7"
						style={{ height: gridHeight }}
					>
						{timeSlots.flatMap(slot =>
							days.map(day => (
								<div
									key={`${day.key}-${slot}`}
									className={`h-6 border-r border-b border-zinc-200 last:border-r-0 ${
										day.isToday
											? 'bg-blue-50/40'
											: day.isPast
												? 'bg-zinc-100/80'
												: ''
									}`}
								/>
							))
						)}

						{freeSlotSegments.map(segment => {
							const day = days[segment.dayIndex]
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
									className="group absolute z-1 flex items-center justify-center rounded-sm bg-emerald-50/80 text-emerald-700 outline-none transition-colors hover:bg-emerald-100 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset"
									style={{
										top: `${segment.top}%`,
										left: `${(segment.dayIndex / days.length) * 100}%`,
										width: `${100 / days.length}%`,
										height: `${segment.height}%`
									}}
									title={label}
									onClick={() => onSelectSlot(new Date(segment.startAt))}
								>
									<span
										aria-hidden="true"
										className="opacity-30 transition-opacity group-hover:opacity-100"
									>
										+
									</span>
								</button>
							)
						})}

						{bookingSegments.map(segment => {
							const isPast = days[segment.dayIndex]?.isPast
							const dayWidth = 100 / days.length

							return (
								<div
									key={`${segment.id}-${segment.dayIndex}`}
									className={`absolute z-10 overflow-hidden rounded px-1.5 py-1 text-xs text-white shadow-sm ${
										segment.isOwn ? 'bg-blue-600' : 'bg-zinc-600'
									} ${isPast ? 'opacity-60 saturate-50' : ''}`}
									style={{
										top: `${segment.top}%`,
										left: `${dayWidth * segment.dayIndex + (dayWidth * segment.columnIndex) / segment.columnCount}%`,
										width: `${dayWidth / segment.columnCount}%`,
										height: `${segment.height}%`
									}}
									title={`${segment.title}: ${formatTimeInTimeZone(new Date(segment.startAt), timeZone)}–${formatTimeInTimeZone(new Date(segment.endAt), timeZone)}`}
								>
									<span
										className={`block truncate font-medium ${segment.isOwn ? 'pr-6' : ''}`}
									>
										{segment.title}
									</span>
									<span className="block truncate opacity-90">
										{segment.authorName}
									</span>
									{segment.isOwn && new Date(segment.startAt) > now && (
										<button
											type="button"
											aria-label={`Скасувати бронювання «${segment.title}»`}
											className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-white/20 text-sm leading-none outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
											title="Скасувати бронювання"
											onClick={() =>
											onCancelBooking({
												id: segment.id,
												title: segment.title,
												recurringSeriesId:
													segment.recurringSeriesId
											})
											}
										>
											×
										</button>
									)}
								</div>
							)
						})}

						{currentMarker && (
							<div
								aria-label={`Поточний час: ${formatTimeInTimeZone(now, timeZone)}`}
								className="pointer-events-none absolute z-10 h-0.5 bg-red-500"
								role="status"
								style={{
									top: `${currentMarker.percentage}%`,
									left: `${(currentMarker.dayIndex / days.length) * 100}%`,
									width: `${100 / days.length}%`
								}}
							>
								<span className="absolute -left-1 -top-0.75 h-2 w-2 rounded-full bg-red-500" />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
