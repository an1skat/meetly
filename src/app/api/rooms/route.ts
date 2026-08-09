import { roomsQuerySchema } from '@/modules/rooms/schemas'
import { getRooms } from '@/server/rooms/read'

export async function GET(request: Request) {
	const url = new URL(request.url)
	const parsed = roomsQuerySchema.safeParse({
		minCapacity: url.searchParams.get('minCapacity') ?? undefined
	})

	if (!parsed.success) {
		return Response.json(
			{ message: 'Некоректна місткість' },
			{ status: 400 }
		)
	}

	try {
		const rooms = await getRooms(parsed.data.minCapacity)

		return Response.json({ rooms })
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати кімнати' },
			{ status: 500 }
		)
	}
}
