'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
	formatWeekLabel,
	getWeekDays,
	isOfficeTimeZone,
	OFFICE_TIME_ZONE
} from './schedule'
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

export function RoomSchedule({ rooms, initialNow }: RoomScheduleProps) {
	const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? '')
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

	if (rooms.length === 0) {
		return (
			<Alert title="Кімнат поки немає">
				Після додавання кімнат вони з’являться у цьому списку.
			</Alert>
		)
	}

	const selectedRoom =
		rooms.find(room => room.id === selectedRoomId) ?? rooms[0]
	const days = getWeekDays(now, weekOffset)

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
							onChange={event => setSelectedRoomId(event.target.value)}
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

			{browserTimeZone && !isOfficeTimeZone(browserTimeZone) && (
				<Alert title="Інший часовий пояс">
					Розклад показано за офісним часом {OFFICE_TIME_ZONE}. Ваш часовий
					пояс: {browserTimeZone}.
				</Alert>
			)}

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

			<p
				aria-live="polite"
				className="text-sm text-zinc-500"
			>
				На цьому тижні бронювань немає.
			</p>

			<WeekGrid
				days={days}
				now={now}
			/>
		</div>
	)
}
