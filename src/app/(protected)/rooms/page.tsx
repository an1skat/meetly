import { RoomSchedule } from '@/modules/rooms/ui/room-schedule'
import { requireUser } from '@/server/auth/session'
import { getRooms } from '@/server/rooms/read'

export default async function RoomsPage() {
	await requireUser()
	const rooms = await getRooms()

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Розклад кімнат</h1>
				<p className="mt-2 text-sm text-zinc-600">
					Оберіть кімнату, а потім вільний слот у розкладі.
				</p>
			</header>

			<RoomSchedule
				rooms={rooms}
				initialNow={new Date().toISOString()}
			/>
		</section>
	)
}
