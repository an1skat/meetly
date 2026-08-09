import { Prisma } from '@/generated/prisma/client'
import type { CreateBookingInput } from '@/modules/bookings/schemas'
import { getBookingSlotStarts } from '@/modules/bookings/slots'
import {
	validateBookingTime,
	type BookingTimeValidationError
} from '@/modules/bookings/time'
import { bookingSelect, type CreatedBooking } from '@/server/bookings/create'
import { prisma } from '@/server/db/prisma'

export type UpdateBookingFailureReason =
	| BookingTimeValidationError
	| 'booking-started'
	| 'forbidden'
	| 'not-found'
	| 'room-not-found'
	| 'slot-taken'

export type UpdateBookingResult =
	| {
			ok: true
			booking: CreatedBooking
	  }
	| {
			ok: false
			reason: UpdateBookingFailureReason
	  }

export async function updateBooking(
	bookingId: string,
	input: CreateBookingInput,
	userId: string,
	now = new Date()
): Promise<UpdateBookingResult> {
	const validationError = validateBookingTime(input.startAt, input.endAt, now)

	if (validationError) {
		return { ok: false, reason: validationError }
	}

	try {
		return await prisma.$transaction(async transaction => {
			const existingBooking = await transaction.booking.findUnique({
				where: { id: bookingId },
				select: {
					userId: true,
					startAt: true
				}
			})

			if (!existingBooking) {
				return { ok: false, reason: 'not-found' }
			}

			if (existingBooking.userId !== userId) {
				return { ok: false, reason: 'forbidden' }
			}

			if (existingBooking.startAt <= now) {
				return { ok: false, reason: 'booking-started' }
			}

			const room = await transaction.room.findUnique({
				where: { id: input.roomId },
				select: { id: true }
			})

			if (!room) {
				return { ok: false, reason: 'room-not-found' }
			}

			await transaction.bookingSlot.deleteMany({
				where: { bookingId }
			})

			const slotData = getBookingSlotStarts(input.startAt, input.endAt).map(
				startsAt => ({
					roomId: input.roomId,
					startsAt
				})
			)
			const booking = await transaction.booking.update({
				where: { id: bookingId },
				data: {
					title: input.title,
					roomId: input.roomId,
					startAt: input.startAt,
					endAt: input.endAt,
					slots: {
						createMany: {
							data: slotData
						}
					}
				},
				select: bookingSelect
			})

			return { ok: true, booking }
		})
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			return { ok: false, reason: 'slot-taken' }
		}

		throw error
	}
}
