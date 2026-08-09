'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { CancelBookingDialog } from '@/modules/bookings/ui/cancel-booking-dialog'
import { CreateBookingDialog } from '@/modules/bookings/ui/create-booking-dialog'
import { roomsQuerySchema } from '@/modules/rooms/schemas'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
	DISPLAY_TIME_LABELS,
	formatWeekLabel,
	getScheduleSlots,
	getTimeZoneDayStart,
	getWeekDays,
	getWeekOffset,
	isOfficeTimeZone,
	OFFICE_TIME_ZONE,
	SLOT_MINUTES,
	type ScheduleBooking
} from '../schedule'
import { WeekGrid } from './week-grid'

type RoomSummary = {
	id: string
	name: string
	floor: number
	capacity: number
}

type RoomScheduleProps = {
	rooms: RoomSummary[]
	initialNow: string
	initialRoomId?: string
	initialWeek?: string
}

const subscribeToTimeZone = () => () => {}
const getBrowserTimeZone = () =>
	Intl.DateTimeFormat().resolvedOptions().timeZone
const getServerTimeZone = () => OFFICE_TIME_ZONE

type RoomBookingsResponse = {
	bookings?: ScheduleBooking[]
	message?: string
}

async function fetchRoomBookings(roomId: string, from: string, to: string) {
	const searchParams = new URLSearchParams({ from, to })
	let response: Response

	try {
		response = await fetch(
			`/api/rooms/${encodeURIComponent(roomId)}/bookings?${searchParams}`
		)
	} catch {
		throw new Error('Немає зв’язку із сервером. Спробуйте ще раз.')
	}

	const payload = (await response
		.json()
		.catch(() => null)) as RoomBookingsResponse | null

	if (!response.ok || !payload?.bookings) {
		throw new Error(payload?.message ?? 'Не вдалося отримати бронювання')
	}

	return payload.bookings
}

export function RoomSchedule({
	rooms,
	initialNow,
	initialRoomId,
	initialWeek
}: RoomScheduleProps) {
	const firstRoomId =
		initialRoomId && rooms.some(room => room.id === initialRoomId)
			? initialRoomId
			: (rooms[0]?.id ?? '')

	const [selectedRoomId, setSelectedRoomId] = useState(firstRoomId)
	const [participantCount, setParticipantCount] = useState('')
	const [emphasizeOwnBookings, setEmphasizeOwnBookings] = useState(true)
	const [selectedStartAt, setSelectedStartAt] = useState<Date | null>(null)
	const [bookingToCancel, setBookingToCancel] = useState<Pick<
		ScheduleBooking,
		'id' | 'title' | 'recurringSeriesId'
	> | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [prevWeekParams, setPrevWeekParams] = useState({
		initialWeek,
		timeZone: OFFICE_TIME_ZONE
	})
	const [weekOffset, setWeekOffset] = useState(() => {
		if (!initialWeek) {
			return 0
		}

		const target = new Date(initialWeek)

		if (Number.isNaN(target.getTime())) {
			return 0
		}

		return getWeekOffset(new Date(initialNow), target, OFFICE_TIME_ZONE)
	})
	const [now, setNow] = useState(() => new Date(initialNow))
	const browserTimeZone = useSyncExternalStore(
		subscribeToTimeZone,
		getBrowserTimeZone,
		getServerTimeZone
	)

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setNow(new Date())
		}, 60_000)

		return () => window.clearInterval(intervalId)
	}, [])

	const capacityResult = roomsQuerySchema.shape.minCapacity.safeParse(
		participantCount === '' ? undefined : participantCount
	)
	const filteredRooms = capacityResult.success
		? rooms.filter(
				room => capacityResult.data === undefined || room.capacity >= capacityResult.data
			)
		: []

	const effectiveRoomId = filteredRooms.some(
		room => room.id === selectedRoomId
	)
		? selectedRoomId
		: (filteredRooms[0]?.id ?? '')

	const selectedRoom =
		filteredRooms.find(room => room.id === effectiveRoomId) ?? filteredRooms[0]

	const timeZone = browserTimeZone ?? OFFICE_TIME_ZONE

	if (
		prevWeekParams.initialWeek !== initialWeek ||
		prevWeekParams.timeZone !== timeZone
	) {
		setPrevWeekParams({ initialWeek, timeZone })

		if (initialWeek) {
			const target = new Date(initialWeek)

			if (!Number.isNaN(target.getTime())) {
				setWeekOffset(getWeekOffset(new Date(initialNow), target, timeZone))
			}
		}
	}

	const days = getWeekDays(now, weekOffset, timeZone)
	const weekAfter = new Date(days[0]!.date)

	weekAfter.setUTCDate(weekAfter.getUTCDate() + 7)

	const from = getTimeZoneDayStart(days[0]!.date, timeZone).toISOString()
	const to = getTimeZoneDayStart(weekAfter, timeZone).toISOString()
	const bookingsQuery = useQuery({
		queryKey: ['room-bookings', selectedRoom?.id, from, to],
		queryFn: () => fetchRoomBookings(selectedRoom!.id, from, to),
		enabled: Boolean(selectedRoom)
	})
	const bookings = bookingsQuery.data ?? []
	const ownBookingCount = bookings.filter(booking => booking.isOwn).length
	const { displayRange } = getScheduleSlots(days, timeZone, now)
	const displayedWorkHours = `${DISPLAY_TIME_LABELS[displayRange.startMinutes / SLOT_MINUTES]}–${DISPLAY_TIME_LABELS[displayRange.endMinutes / SLOT_MINUTES]}`
	const selectRoom = (roomId: string) => {
		setSelectedRoomId(roomId)
		setSelectedStartAt(null)
		setBookingToCancel(null)
		setSuccessMessage(null)
	}
	const participantCountField = (id: string, className = 'h-11') => (
		<Input
			id={id}
			label="Кількість учасників"
			type="number"
			min={1}
			step={1}
			value={participantCount}
			error={
				capacityResult.success
					? undefined
					: 'Введіть ціле число, більше за нуль.'
			}
			placeholder="Наприклад, 6"
			className={className}
			onChange={event => setParticipantCount(event.target.value)}
		/>
	)

	return (
		<div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl shadow-black/20 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
			<aside className="hidden bg-canvas/55 p-4 lg:block lg:border-r lg:border-line">
				<div className="mb-5 flex items-center justify-between">
					<h2 className="font-bold">Кімнати</h2>
					<span className="rounded-full bg-raised px-2 py-1 text-xs font-semibold text-muted">
						{filteredRooms.length}
					</span>
				</div>

				{participantCountField('participant-count')}

				<div
					role={filteredRooms.length > 0 ? 'listbox' : undefined}
					aria-label={filteredRooms.length > 0 ? 'Оберіть кімнату' : undefined}
					className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"
				>
					{filteredRooms.map(room => {
						const isSelected = room.id === effectiveRoomId

						return (
							<button
								key={room.id}
								type="button"
								role="option"
								aria-selected={isSelected}
								className={`rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
									isSelected
										? 'border-lime/30 bg-lime-soft text-ink'
										: 'border-transparent text-muted hover:border-line hover:bg-raised hover:text-ink'
								}`}
								onClick={() => selectRoom(room.id)}
							>
								<span className="flex items-center justify-between gap-2 font-semibold">
									{room.name}
									{isSelected && <span className="text-lime">→</span>}
								</span>
								<span className="mt-2 block text-xs">
									{room.capacity} місць · {room.floor} поверх
								</span>
							</button>
						)
					})}

					{filteredRooms.length === 0 && (
						<p
							role="status"
							className="col-span-full rounded-2xl border border-dashed border-line bg-raised/55 p-4 text-sm leading-5 text-muted"
						>
							{rooms.length === 0
								? 'Кімнат поки немає.'
								: capacityResult.success
									? 'Немає кімнат потрібної місткості.'
									: 'Уточніть кількість учасників.'}
						</p>
					)}
				</div>

				<dl className="mt-5 grid gap-3 border-t border-line pt-4 text-xs text-muted">
					<div>
						<dt>Робочі години у вашому поясі</dt>
						<dd className="mt-0.5 font-semibold text-ink">
							{displayedWorkHours}
						</dd>
					</div>
					<div>
						<dt>Ваш часовий пояс</dt>
						<dd className="mt-0.5 break-words font-semibold text-ink">
							{timeZone}
						</dd>
					</div>
					<div>
						<dt>Часовий пояс офісу</dt>
						<dd className="mt-0.5 break-words font-semibold text-ink">
							{OFFICE_TIME_ZONE}
						</dd>
					</div>
				</dl>
			</aside>

			<div className="min-w-0 p-3 sm:p-6">
				<div className="grid gap-3 rounded-2xl bg-canvas/55 p-3 lg:hidden">
					<label
						htmlFor="mobile-room"
						className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink"
					>
						Кімната
						<span className="relative">
							<select
								id="mobile-room"
								value={effectiveRoomId}
								disabled={filteredRooms.length === 0}
								className="h-12 w-full appearance-none rounded-xl border border-line bg-raised px-3 pr-10 text-sm text-ink outline-none focus:border-lime focus:ring-2 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
								onChange={event => selectRoom(event.target.value)}
							>
								{filteredRooms.length === 0 && (
									<option value="">Немає доступних кімнат</option>
								)}
								{filteredRooms.map(room => (
									<option
										key={room.id}
										value={room.id}
									>
										{room.name} · {room.capacity} місць · {room.floor} поверх
									</option>
								))}
							</select>
							<svg
								aria-hidden="true"
								viewBox="0 0 16 16"
								className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-1.5"
							>
								<path d="m4 6 4 4 4-4" />
							</svg>
						</span>
					</label>

					{participantCountField('participant-count-mobile', 'h-12')}

					<p className="text-xs leading-5 text-muted">
						Робочі години:{' '}
						<strong className="text-ink">{displayedWorkHours}</strong>
						<br />
						Ваш пояс: {timeZone} · офіс: {OFFICE_TIME_ZONE}
					</p>
				</div>

				{selectedRoom ? (
					<>
				<div className="space-y-4">
					{!isOfficeTimeZone(timeZone) && (
						<Alert title="Інший часовий пояс">
							Часова шкала та бронювання показані у вашому поясі: {timeZone}.
						</Alert>
					)}

					{successMessage && <Alert variant="success">{successMessage}</Alert>}
				</div>

				<div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							Розклад кімнати
						</p>
						<h2 className="mt-1 text-2xl font-bold tracking-tight">
							{selectedRoom.name}
						</h2>
						<div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
							<span className="rounded-lg bg-raised px-2.5 py-1.5">
								{selectedRoom.floor} поверх
							</span>
							<span className="rounded-lg bg-raised px-2.5 py-1.5">
								до {selectedRoom.capacity} людей
							</span>
						</div>
					</div>

					<nav
						aria-label="Навігація за тижнями"
						className="flex items-center self-start overflow-hidden rounded-xl border border-line bg-raised xl:self-auto"
					>
						<button
							type="button"
							aria-label="Попередній тиждень"
							className="h-11 border-r border-line px-3 text-muted hover:bg-line/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-lime"
							onClick={() => setWeekOffset(value => value - 1)}
						>
							←
						</button>
						<button
							type="button"
							className="h-11 min-w-38 px-4 text-sm font-semibold hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-lime"
							onClick={() => setWeekOffset(0)}
						>
							{formatWeekLabel(days)}
						</button>
						<button
							type="button"
							aria-label="Наступний тиждень"
							className="h-11 border-l border-line px-3 text-muted hover:bg-line/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-lime"
							onClick={() => setWeekOffset(value => value + 1)}
						>
							→
						</button>
					</nav>
				</div>

				<div className="my-5 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
					<p className="text-sm text-muted">
						Натисніть на вільний слот, щоб створити бронювання.
					</p>
					<button
						type="button"
						aria-pressed={emphasizeOwnBookings}
						className={`inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime lg:min-h-9 ${
							emphasizeOwnBookings
								? 'border-lime/40 bg-lime text-lime-ink'
								: 'border-line bg-raised text-muted hover:text-ink'
						}`}
						onClick={() => setEmphasizeOwnBookings(value => !value)}
					>
						<span aria-hidden="true">●</span> Мої · {ownBookingCount}
					</button>
				</div>

				{bookingsQuery.isPending ||
				(bookingsQuery.isFetching && !bookingsQuery.data) ? (
					<div className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-line bg-raised text-sm text-muted">
						<Spinner label="Завантаження бронювань" />
						Завантажуємо бронювання…
					</div>
				) : bookingsQuery.isError ? (
					<Alert
						title="Не вдалося завантажити розклад"
						variant="error"
					>
						<p>{bookingsQuery.error.message}</p>
						<Button
							className="mt-3"
							disabled={bookingsQuery.isFetching}
							variant="secondary"
							onClick={() => void bookingsQuery.refetch()}
						>
							Повторити
						</Button>
					</Alert>
				) : (
					<>
						{bookings.length === 0 && (
							<p
								aria-live="polite"
								className="mb-3 text-sm text-muted"
							>
								На цьому тижні бронювань немає.
							</p>
						)}

						<WeekGrid
							bookings={bookings}
							days={days}
							emphasizeOwnBookings={emphasizeOwnBookings}
							now={now}
							timeZone={timeZone}
							onCancelBooking={booking => {
								setSelectedStartAt(null)
								setBookingToCancel(booking)
								setSuccessMessage(null)
							}}
							onSelectSlot={startAt => {
								setBookingToCancel(null)
								setSelectedStartAt(startAt)
								setSuccessMessage(null)
							}}
						/>
					</>
				)}

				{selectedStartAt && (
					<CreateBookingDialog
						room={{ ...selectedRoom, bookings }}
						startAt={selectedStartAt}
						timeZone={timeZone}
						onClose={() => setSelectedStartAt(null)}
						onConflict={() => void bookingsQuery.refetch()}
						onCreated={() => {
							setSelectedStartAt(null)
							setSuccessMessage('Бронювання успішно створено.')
							void bookingsQuery.refetch()
						}}
					/>
				)}

				{bookingToCancel && (
					<CancelBookingDialog
						booking={bookingToCancel}
						onClose={() => setBookingToCancel(null)}
						onCancelled={async () => {
							await bookingsQuery.refetch()
							setBookingToCancel(null)
							setSuccessMessage('Бронювання успішно скасовано.')
						}}
					/>
				)}
					</>
				) : (
					<div className="grid min-h-[34rem] place-items-center py-12 text-center">
						<div className="max-w-sm">
							<svg
								aria-hidden="true"
								viewBox="0 0 48 48"
								className="mx-auto h-12 w-12 fill-none stroke-lime stroke-1.5"
							>
								<rect x="7" y="10" width="34" height="30" rx="8" />
								<path d="M15 7v7M33 7v7M7 19h34M16 27h16M16 33h10" />
							</svg>
							<p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
								Розклад кімнати
							</p>
							<h2 className="mt-2 text-2xl font-bold tracking-tight">
								{rooms.length === 0
									? 'Кімнат поки немає'
									: capacityResult.success
										? 'Нічого не знайдено'
										: 'Перевірте кількість учасників'}
							</h2>
							<p className="mt-3 text-sm leading-6 text-muted">
								{rooms.length === 0
									? 'Щойно кімнати додадуть, їхній розклад з’явиться тут.'
									: capacityResult.success
										? 'Зменште кількість учасників, щоб побачити доступні кімнати.'
										: 'Введіть ціле число, більше за нуль.'}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
