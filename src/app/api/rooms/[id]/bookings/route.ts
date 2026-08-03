import { bookingRangeSchema } from '@/modules/bookings/schemas'
import { roomParamsSchema } from '@/modules/rooms/schemas'
import { getCurrentUser } from '@/server/auth/session'
import { getRoomBookings } from '@/server/bookings/read'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await getCurrentUser()

		if (!user) {
			return Response.json(
				{ message: 'Потрібно увійти в обліковий запис' },
				{ status: 401 }
			)
		}

		const parsedParams = roomParamsSchema.safeParse(await params)
		const url = new URL(request.url)
		const parsedRange = bookingRangeSchema.safeParse({
			from: url.searchParams.get('from'),
			to: url.searchParams.get('to')
		})

		if (!parsedParams.success || !parsedRange.success) {
			return Response.json(
				{ message: 'Некоректний ідентифікатор кімнати або діапазон дат' },
				{ status: 400 }
			)
		}

		const bookings = await getRoomBookings(
			parsedParams.data.id,
			parsedRange.data.from,
			parsedRange.data.to,
			user.id
		)

		return Response.json({ bookings })
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати бронювання' },
			{ status: 500 }
		)
	}
}
