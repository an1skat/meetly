import { roomParamsSchema } from '@/modules/rooms/schemas'
import { getRoomById } from '@/server/rooms/read'

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const parsed = roomParamsSchema.safeParse(await params)

	if (!parsed.success) {
		return Response.json(
			{ message: 'Некоректний ідентифікатор кімнати' },
			{ status: 400 }
		)
	}

	try {
		const room = await getRoomById(parsed.data.id)

		if (!room) {
			return Response.json(
				{ message: 'Кімнату не знайдено' },
				{ status: 404 }
			)
		}

		return Response.json({ room })
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати кімнату' },
			{ status: 500 }
		)
	}
}
