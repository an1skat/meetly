import { createBookingRequestSchema } from '@/modules/bookings/schemas'
import { OFFICE_TIME_ZONE } from '@/modules/bookings/time'
import { getCurrentUser } from '@/server/auth/session'
import {
	createBooking,
	type CreateBookingFailureReason
} from '@/server/bookings/create'
import { createRecurringBooking } from '@/server/bookings/create-recurring'
import z from 'zod'

type FailureResponse = {
	status: number
	body: {
		message: string
		fieldErrors: Record<string, string[]>
	}
}

const failureResponses: Record<CreateBookingFailureReason, FailureResponse> = {
	'email-not-verified': {
		status: 403,
		body: {
			message: 'Підтвердьте email перед створенням бронювання',
			fieldErrors: {}
		}
	},
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

const conflictDateFormatter = new Intl.DateTimeFormat('uk-UA', {
	timeZone: OFFICE_TIME_ZONE,
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric'
})

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
		const parsed = createBookingRequestSchema.safeParse(body)

		if (!parsed.success) {
			return Response.json(
				{
					message: 'Перевірте введені дані',
					fieldErrors: z.flattenError(parsed.error).fieldErrors
				},
				{ status: 400 }
			)
		}

		const { recurrence, ...bookingInput } = parsed.data
		const result = recurrence
			? await createRecurringBooking(
					{
						...bookingInput,
						repeatCount: recurrence.count
					},
					user
				)
			: await createBooking(bookingInput, user)

		if (!result.ok) {
			if (
				result.reason === 'slot-taken' &&
				'conflictingStartAt' in result &&
				result.conflictingStartAt instanceof Date
			) {
				const message = `Цей час уже зайнятий: ${conflictDateFormatter.format(
					result.conflictingStartAt
				)}`

				return Response.json(
					{
						message,
						fieldErrors: {
							startAt: [message],
							endAt: [message]
						}
					},
					{ status: 409 }
				)
			}

			const response = failureResponses[result.reason]

			return Response.json(response.body, {
				status: response.status
			})
		}

		if ('bookings' in result) {
			return Response.json(
				{
					seriesId: result.seriesId,
					bookings: result.bookings
				},
				{ status: 201 }
			)
		}

		return Response.json({ booking: result.booking }, { status: 201 })
	} catch {
		return Response.json(
			{ message: 'Не вдалося створити бронювання' },
			{ status: 500 }
		)
	}
}
