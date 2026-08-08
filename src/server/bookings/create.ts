import { Prisma } from '@/generated/prisma/client'
import type { CreateBookingInput } from '@/modules/bookings/schemas'
import { getBookingSlotStarts } from '@/modules/bookings/slots'
import {
	validateBookingTime,
	type BookingTimeValidationError
} from '@/modules/bookings/time'
import { prisma } from '@/server/db/prisma'

export const bookingSelect = {
	id: true,
	title: true,
	startAt: true,
	endAt: true,
	roomId: true,
	recurringSeriesId: true,
	user: {
		select: {
			id: true,
			name: true
		}
	}
} satisfies Prisma.BookingSelect

export type CreatedBooking = Prisma.BookingGetPayload<{
	select: typeof bookingSelect
}>

export type CreateBookingFailureReason =
	| BookingTimeValidationError
	| 'email-not-verified'
	| 'room-not-found'
	| 'slot-taken'

export type CreateBookingResult =
	| {
			ok: true
			booking: CreatedBooking
	  }
	| {
			ok: false
			reason: CreateBookingFailureReason
	  }

class RoomNotFoundError extends Error {}

export type BookingActor = {
	id: string
	emailVerifiedAt: Date | null
}

export async function createBooking(
	input: CreateBookingInput,
	actor: BookingActor,
	now = new Date()
): Promise<CreateBookingResult> {
	if (!actor.emailVerifiedAt) {
		return {
			ok: false,
			reason: 'email-not-verified'
		}
	}

	const validationError = validateBookingTime(input.startAt, input.endAt, now)

	if (validationError) {
		return {
			ok: false,
			reason: validationError
		}
	}

	try {
		const booking = await prisma.$transaction(async transaction => {
			const room = await transaction.room.findUnique({
				where: {
					id: input.roomId
				},
				select: {
					id: true
				}
			})

			if (!room) {
				throw new RoomNotFoundError()
			}

			const slotData = getBookingSlotStarts(input.startAt, input.endAt).map(
				startsAt => ({
					roomId: input.roomId,
					startsAt
				})
			)

			return transaction.booking.create({
				data: {
					title: input.title,
					startAt: input.startAt,
					endAt: input.endAt,
					user: {
						connect: {
							id: actor.id
						}
					},
					room: {
						connect: {
							id: input.roomId
						}
					},
					slots: {
						createMany: {
							data: slotData
						}
					}
				},
				select: bookingSelect
			})
		})

		return {
			ok: true,
			booking
		}
	} catch (error) {
		if (error instanceof RoomNotFoundError) {
			return {
				ok: false,
				reason: 'room-not-found'
			}
		}

		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			return {
				ok: false,
				reason: 'slot-taken'
			}
		}

		throw error
	}
}
