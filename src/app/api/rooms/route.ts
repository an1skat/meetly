import { getRooms } from '@/server/rooms/read'

export async function GET() {
	try {
		const rooms = await getRooms()

		return Response.json({ rooms })
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати кімнати' },
			{ status: 500 }
		)
	}
}
