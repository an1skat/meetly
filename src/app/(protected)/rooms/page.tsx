import { RoomSchedule } from '@/modules/rooms/room-schedule'
import { getRoomsWithBookings } from '@/server/rooms/read'

export default async function RoomsPage() {
	const rooms = await getRoomsWithBookings()

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Розклад кімнат</h1>
				<p className="mt-2 text-sm text-zinc-600">
					Оберіть кімнату та переглядайте її розклад за тижнями.
				</p>
			</header>

			<RoomSchedule
				rooms={rooms.map(room => ({
					...room,
					bookings: room.bookings.map(booking => ({
						id: booking.id,
						title: booking.title,
						startAt: booking.startAt.toISOString(),
						endAt: booking.endAt.toISOString(),
						authorName: booking.user.name
					}))
				}))}
				initialNow={new Date().toISOString()}
			/>
		</section>
	)
}
