'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CancelBookingDialog } from '@/modules/bookings/ui/cancel-booking-dialog'
import { CreateBookingDialog } from '@/modules/bookings/ui/create-booking-dialog'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
	formatWeekLabel,
	getTimeZoneDayStart,
	getWeekDays,
	isOfficeTimeZone,
	OFFICE_TIME_ZONE,
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

export function RoomSchedule({ rooms, initialNow }: RoomScheduleProps) {
	const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? '')
	const [selectedStartAt, setSelectedStartAt] = useState<Date | null>(null)
	const [bookingToCancel, setBookingToCancel] = useState<Pick<
		ScheduleBooking,
		'id' | 'title'
	> | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [weekOffset, setWeekOffset] = useState(0)
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

	const selectedRoom =
		rooms.find(room => room.id === selectedRoomId) ?? rooms[0]
	const timeZone = browserTimeZone ?? OFFICE_TIME_ZONE
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

	if (!selectedRoom) {
		return (
			<Alert title="Кімнат поки немає">
				Після додавання кімнат вони з’являться у цьому списку.
			</Alert>
		)
	}

	return (
		<div className="space-y-5">
			<div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
				<div className="grid gap-4 md:grid-cols-[minmax(16rem,1fr)_auto] md:items-end">
					<div className="grid gap-1.5">
						<label
							className="text-sm font-medium"
							htmlFor="room"
						>
							Кімната
						</label>
						<select
							id="room"
							className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
							value={selectedRoom.id}
							onChange={event => {
								setSelectedRoomId(event.target.value)
								setSelectedStartAt(null)
								setBookingToCancel(null)
								setSuccessMessage(null)
							}}
						>
							{rooms.map(room => (
								<option
									key={room.id}
									value={room.id}
								>
									{room.name}
								</option>
							))}
						</select>
					</div>

					<dl className="grid grid-cols-2 gap-3 text-sm">
						<div className="rounded-lg bg-zinc-100 px-4 py-2">
							<dt className="text-xs text-zinc-500">Поверх</dt>
							<dd className="font-semibold">{selectedRoom.floor}</dd>
						</div>
						<div className="rounded-lg bg-zinc-100 px-4 py-2">
							<dt className="text-xs text-zinc-500">Місткість</dt>
							<dd className="font-semibold">{selectedRoom.capacity}</dd>
						</div>
					</dl>
				</div>
			</div>

			<p className="text-sm text-zinc-600">
				Робочі години офісу: 09:00–19:00, {OFFICE_TIME_ZONE}
			</p>

			{!isOfficeTimeZone(timeZone) && (
				<Alert title="Інший часовий пояс">
					Часова шкала та бронювання показані у вашому поясі: {timeZone}.
				</Alert>
			)}

			{successMessage && <Alert variant="success">{successMessage}</Alert>}

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold">{selectedRoom.name}</h2>
					<p className="text-sm text-zinc-600">{formatWeekLabel(days)}</p>
				</div>

				<nav
					aria-label="Навігація за тижнями"
					className="flex flex-wrap gap-2"
				>
					<Button
						aria-label="Попередній тиждень"
						variant="secondary"
						onClick={() => setWeekOffset(value => value - 1)}
					>
						← Попередній
					</Button>
					<Button
						disabled={weekOffset === 0}
						variant="secondary"
						onClick={() => setWeekOffset(0)}
					>
						Поточний
					</Button>
					<Button
						aria-label="Наступний тиждень"
						variant="secondary"
						onClick={() => setWeekOffset(value => value + 1)}
					>
						Наступний →
					</Button>
				</nav>
			</div>

			<p className="text-sm text-zinc-600">
				Оберіть зелений вільний слот, щоб створити бронювання.
			</p>

			{bookingsQuery.isPending ||
			(bookingsQuery.isFetching && !bookingsQuery.data) ? (
				<div className="flex min-h-48 items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600">
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
							className="text-sm text-zinc-500"
						>
							На цьому тижні бронювань немає.
						</p>
					)}

					<WeekGrid
						bookings={bookings}
						days={days}
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
		</div>
	)
}
