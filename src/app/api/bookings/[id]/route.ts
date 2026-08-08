import { cancelBookingQuerySchema } from '@/modules/bookings/schemas'
import { getCurrentUser } from '@/server/auth/session'
import {
	cancelBooking,
	type CancelBookingResult
} from '@/server/bookings/cancel'

const failureResponses: Record<
	Exclude<CancelBookingResult, { ok: true }>['reason'],
	{ status: number; message: string }
> = {
	'not-found': {
		status: 404,
		message: 'Бронювання не знайдено'
	},
	forbidden: {
		status: 403,
		message: 'Ви можете скасувати лише власне бронювання'
	},
	past: {
		status: 409,
		message: 'Бронювання, яке вже почалося, не можна скасувати'
	}
}

export async function DELETE(
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

		const url = new URL(request.url)
		const parsedQuery = cancelBookingQuerySchema.safeParse({
			scope: url.searchParams.get('scope') ?? undefined
		})

		if (!parsedQuery.success) {
			return Response.json(
				{ message: 'Некоректний тип скасування' },
				{ status: 400 }
			)
		}

		const { id } = await params
		const result = await cancelBooking(id, user.id, parsedQuery.data.scope)

		if (!result.ok) {
			const response = failureResponses[result.reason]

			return Response.json(
				{ message: response.message },
				{ status: response.status }
			)
		}

		return new Response(null, { status: 204 })
	} catch {
		return Response.json(
			{ message: 'Не вдалося скасувати бронювання' },
			{ status: 500 }
		)
	}
}
