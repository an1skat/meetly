import { createBookingSchema } from '@/modules/bookings/schemas'
import { getCurrentUser } from '@/server/auth/session'
import {
	createBooking,
	type CreateBookingFailureReason
} from '@/server/bookings/create'
import z from 'zod'

type FailureResponse = {
	status: number
	body: {
		message: string
		fieldErrors: Record<string, string[]>
	}
}

const failureResponses: Record<CreateBookingFailureReason, FailureResponse> = {
	order: {
		status: 400,
		body: {
			message: 'Час початку має бути раніше за час завершення',
			fieldErrors: {
				endAt: ['Час завершення має бути пізніше за час початку']
			}
		}
	},
	slot: {
		status: 400,
		body: {
			message: 'Час має відповідати 30-хвилинній сітці',
			fieldErrors: {
				startAt: ['Вкажіть час із кроком 30 хвилин'],
				endAt: ['Вкажіть час із кроком 30 хвилин']
			}
		}
	},
	duration: {
		status: 400,
		body: {
			message: 'Тривалість бронювання має становити від 30 хвилин до 4 годин',
			fieldErrors: {
				endAt: ['Тривалість бронювання має становити від 30 хвилин до 4 годин']
			}
		}
	},
	'office-hours': {
		status: 400,
		body: {
			message: 'Бронювання має бути в межах 09:00–19:00 за київським часом',
			fieldErrors: {
				startAt: ['Робочі години: 09:00–19:00 за київським часом'],
				endAt: ['Робочі години: 09:00–19:00 за київським часом']
			}
		}
	},
	past: {
		status: 400,
		body: {
			message: 'Бронювання можна створити лише на майбутній час',
			fieldErrors: {
				startAt: ['Вкажіть час у майбутньому']
			}
		}
	},
	'room-not-found': {
		status: 404,
		body: {
			message: 'Кімнату не знайдено',
			fieldErrors: {
				roomId: ['Кімнату не знайдено']
			}
		}
	},
	'slot-taken': {
		status: 409,
		body: {
			message: 'Цей слот уже зайнятий',
			fieldErrors: {
				startAt: ['Цей слот уже зайнятий'],
				endAt: ['Цей слот уже зайнятий']
			}
		}
	}
}

export async function POST(request: Request) {
	try {
		const user = await getCurrentUser()

		if (!user) {
			return Response.json(
				{ message: 'Потрібно увійти в обліковий запис' },
				{ status: 401 }
			)
		}

		const body = await request.json().catch(() => null)
		const parsed = createBookingSchema.safeParse(body)

		if (!parsed.success) {
			return Response.json(
				{
					message: 'Перевірте введені дані',
					fieldErrors: z.flattenError(parsed.error).fieldErrors
				},
				{ status: 400 }
			)
		}

		const result = await createBooking(parsed.data, user.id)

		if (!result.ok) {
			const response = failureResponses[result.reason]

			return Response.json(response.body, {
				status: response.status
			})
		}

		return Response.json({ booking: result.booking }, { status: 201 })
	} catch {
		return Response.json(
			{ message: 'Не вдалося створити бронювання' },
			{ status: 500 }
		)
	}
}
