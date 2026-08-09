import {
	cancelBookingQuerySchema,
	updateBookingSchema
} from '@/modules/bookings/schemas'
import { getCurrentUser } from '@/server/auth/session'
import {
	cancelBooking,
	type CancelBookingResult
} from '@/server/bookings/cancel'
import {
	updateBooking,
	type UpdateBookingFailureReason
} from '@/server/bookings/update'
import z from 'zod'
import {
	bookingWriteFailureResponses,
	type BookingFailureResponse
} from '../failure-responses'

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

const updateFailureResponses: Record<
	UpdateBookingFailureReason,
	BookingFailureResponse
> = {
	...bookingWriteFailureResponses,
	'booking-started': {
		status: 409,
		body: {
			message: 'Бронювання, яке вже почалося, не можна редагувати',
			fieldErrors: {}
		}
	},
	'not-found': {
		status: 404,
		body: { message: 'Бронювання не знайдено', fieldErrors: {} }
	},
	forbidden: {
		status: 403,
		body: {
			message: 'Ви можете редагувати лише власне бронювання',
			fieldErrors: {}
		}
	}
}

export async function PATCH(
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

		const body = await request.json().catch(() => null)
		const parsed = updateBookingSchema.safeParse(body)

		if (!parsed.success) {
			return Response.json(
				{
					message: 'Перевірте введені дані',
					fieldErrors: z.flattenError(parsed.error).fieldErrors
				},
				{ status: 400 }
			)
		}

		const { id } = await params
		const result = await updateBooking(id, parsed.data, user.id)

		if (!result.ok) {
			const response = updateFailureResponses[result.reason]

			return Response.json(response.body, { status: response.status })
		}

		return Response.json({ booking: result.booking })
	} catch {
		return Response.json(
			{ message: 'Не вдалося оновити бронювання' },
			{ status: 500 }
		)
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
