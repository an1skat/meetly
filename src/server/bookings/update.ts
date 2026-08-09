import { Prisma } from '@/generated/prisma/client'
import type { UpdateBookingInput } from '@/modules/bookings/schemas'
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
	| 'cannot-shorten'
	| 'forbidden'
	| 'not-found'
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
	input: UpdateBookingInput,
	userId: string,
	now = new Date()
): Promise<UpdateBookingResult> {
	try {
		return await prisma.$transaction(async transaction => {
			const existingBooking = await transaction.booking.findUnique({
				where: { id: bookingId },
				select: {
					userId: true,
					roomId: true,
					startAt: true,
					endAt: true
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

			if (input.endAt < existingBooking.endAt) {
				return { ok: false, reason: 'cannot-shorten' }
			}

			const validationError = validateBookingTime(
				existingBooking.startAt,
				input.endAt,
				now
			)

			if (validationError) {
				return { ok: false, reason: validationError }
			}

			const isExtension = input.endAt > existingBooking.endAt
			const booking = await transaction.booking.update({
				where: { id: bookingId },
				data: isExtension
					? {
							title: input.title,
							endAt: input.endAt,
							slots: {
								createMany: {
									data: getBookingSlotStarts(
										existingBooking.endAt,
										input.endAt
									).map(startsAt => ({
										roomId: existingBooking.roomId,
										startsAt
									}))
								}
							}
						}
					: { title: input.title },
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
