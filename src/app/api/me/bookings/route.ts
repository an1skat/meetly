import { myBookingsQuerySchema } from '@/modules/bookings/schemas'
import { getCurrentUser } from '@/server/auth/session'
import { getMyBookings } from '@/server/bookings/read'

export async function GET(request: Request) {
	try {
		const user = await getCurrentUser()

		if (!user) {
			return Response.json(
				{ message: 'Потрібно увійти в обліковий запис' },
				{ status: 401 }
			)
		}

		const url = new URL(request.url)
		const parsed = myBookingsQuerySchema.safeParse({
			type: url.searchParams.get('type') ?? undefined,
			page: url.searchParams.get('page') ?? undefined
		})

		if (!parsed.success) {
			return Response.json(
				{ message: 'Некоректні параметри запиту' },
				{ status: 400 }
			)
		}

		const result = await getMyBookings(
			user.id,
			parsed.data.type,
			parsed.data.page
		)

		return Response.json(result)
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати бронювання' },
			{ status: 500 }
		)
	}
}
