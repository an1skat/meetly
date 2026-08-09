import { createBookingRequestSchema } from '@/modules/bookings/schemas'
import { OFFICE_TIME_ZONE } from '@/modules/bookings/time'
import { getCurrentUser } from '@/server/auth/session'
import {
	createBooking,
	type CreateBookingFailureReason
} from '@/server/bookings/create'
import { createRecurringBooking } from '@/server/bookings/create-recurring'
import z from 'zod'
import {
	bookingWriteFailureResponses,
	type BookingFailureResponse
} from './failure-responses'

const failureResponses: Record<
	CreateBookingFailureReason,
	BookingFailureResponse
> = {
	...bookingWriteFailureResponses,
	'email-not-verified': {
		status: 403,
		body: {
			message: 'Підтвердьте email перед створенням бронювання',
			fieldErrors: {}
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
