import {
	DISPLAY_TIME_LABELS,
	DISPLAY_TIME_SLOTS,
	formatTimeInTimeZone,
	getBookingSegments,
	getCurrentTimeMarker,
	type ScheduleBooking,
	type WeekDay
} from './schedule'

type WeekGridProps = {
	bookings: ScheduleBooking[]
	days: WeekDay[]
	now: Date
	timeZone: string
}

const SLOT_HEIGHT = 24

export function WeekGrid({ bookings, days, now, timeZone }: WeekGridProps) {
	const marker = getCurrentTimeMarker(now, days, timeZone)
	const bookingSegments = getBookingSegments(bookings, days, timeZone)
	const gridHeight = DISPLAY_TIME_SLOTS.length * SLOT_HEIGHT

	return (
		<div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
			<div className="min-w-[880px]">
				<div className="grid grid-cols-[5rem_1fr] border-b border-zinc-200">
					<div className="flex items-center justify-end bg-zinc-50 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
						Час
					</div>

					<div className="grid grid-cols-7">
						{days.map(day => (
							<div
								key={day.key}
								className={`border-l border-zinc-200 px-2 py-3 text-center ${
									day.isToday ? 'bg-blue-50 text-blue-900' : ''
								}`}
							>
								<span className="block text-xs font-medium uppercase tracking-wide">
									{day.weekdayLabel}
								</span>
								<span className="mt-1 block text-sm font-semibold">
									{day.dateLabel}
								</span>
								{day.isToday && <span className="sr-only">Сьогодні</span>}
							</div>
						))}
					</div>
				</div>

				<div className="grid grid-cols-[5rem_1fr]">
					<div
						className="relative border-r border-zinc-200 bg-zinc-50"
						style={{ height: gridHeight }}
					>
						{DISPLAY_TIME_LABELS.map((label, index) => (
							<span
								key={label}
								className={`absolute right-3 text-xs tabular-nums text-zinc-500 ${
									index === 0
										? 'translate-y-1'
										: index === DISPLAY_TIME_LABELS.length - 1
											? '-translate-y-full'
											: '-translate-y-1/2'
								}`}
								style={{ top: `${(index / DISPLAY_TIME_SLOTS.length) * 100}%` }}
							>
								{label}
							</span>
						))}
					</div>

					<div
						className="relative grid grid-cols-7"
						style={{ height: gridHeight }}
					>
						{DISPLAY_TIME_SLOTS.flatMap(slot =>
							days.map(day => (
								<div
									key={`${day.key}-${slot}`}
									className={`h-6 border-r border-b border-zinc-200 last:border-r-0 ${
										day.isToday ? 'bg-blue-50/40' : ''
									}`}
								/>
							))
						)}

						{bookingSegments.map(segment => (
							<div
								key={`${segment.id}-${segment.dayIndex}`}
								className="absolute z-10 overflow-hidden rounded bg-blue-600 px-1.5 py-1 text-xs text-white shadow-sm"
								style={{
									top: `${segment.top}%`,
									left: `${(segment.dayIndex / days.length) * 100}%`,
									width: `${100 / days.length}%`,
									height: `${segment.height}%`
								}}
								title={`${segment.title}: ${formatTimeInTimeZone(new Date(segment.startAt), timeZone)}–${formatTimeInTimeZone(new Date(segment.endAt), timeZone)}`}
							>
								<span className="block truncate font-medium">{segment.title}</span>
								<span className="block truncate opacity-90">{segment.authorName}</span>
							</div>
						))}

						{marker && (
							<div
								aria-label={`Поточний час: ${formatTimeInTimeZone(now, timeZone)}`}
								className="pointer-events-none absolute z-10 h-0.5 bg-red-500"
								role="status"
								style={{
									top: `${marker.percentage}%`,
									left: `${(marker.dayIndex / days.length) * 100}%`,
									width: `${100 / days.length}%`
								}}
							>
								<span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-red-500" />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
