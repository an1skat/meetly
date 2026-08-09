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
		<section className="space-y-7">
			{query.emailVerified === '1' && (
				<Alert
					title="Email підтверджено"
					variant="success"
				>
					Тепер ви можете створювати бронювання.
				</Alert>
			)}

			<header className="max-w-3xl">
				<p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-lime">
					<span className="h-2 w-2 rounded-full bg-lime" /> Розклад кімнат
				</p>
				<h1 className="text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">
					Знайдіть місце для наступної ідеї.
				</h1>
				<p className="mt-4 text-base leading-7 text-muted">
					Оберіть кімнату та натисніть на вільний час — решту ми вже
					підставили.
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
