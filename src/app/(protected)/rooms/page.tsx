import { Alert } from '@/components/ui/alert'
import { RoomSchedule } from '@/modules/rooms/ui/room-schedule'
import { requireUser } from '@/server/auth/session'
import { getRooms } from '@/server/rooms/read'

type RoomsPageProps = {
	searchParams: Promise<{
		emailVerified?: string | string[]
		roomId?: string | string[]
		week?: string | string[]
	}>
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
	await requireUser()

	const [rooms, query] = await Promise.all([getRooms(), searchParams])

	const initialRoomId =
		typeof query.roomId === 'string' ? query.roomId : undefined

	const initialWeek =
		typeof query.week === 'string' &&
		!Number.isNaN(new Date(query.week).getTime())
			? query.week
			: undefined

	return (
		<section className="space-y-6">
			{query.emailVerified === '1' && (
				<Alert
					title="Email підтверджено"
					variant="success"
				>
					Тепер ви можете створювати бронювання.
				</Alert>
			)}

			<header>
				<h1 className="text-2xl font-semibold">Розклад кімнат</h1>
				<p className="mt-2 text-sm text-zinc-600">
					Оберіть кімнату, а потім вільний слот у розкладі.
				</p>
			</header>

			<RoomSchedule
				rooms={rooms}
				initialNow={new Date().toISOString()}
				initialRoomId={initialRoomId}
				initialWeek={initialWeek}
			/>
		</section>
	)
}
