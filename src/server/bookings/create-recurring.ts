import { Prisma } from '@/generated/prisma/client'
import type { CreateRecurringBookingInput } from '@/modules/bookings/schemas'
import { getBookingSlotStarts } from '@/modules/bookings/slots'
import {
	addOfficeWeeks,
	getOfficeWeekday,
	validateBookingTime
} from '@/modules/bookings/time'
import { prisma } from '@/server/db/prisma'
import {
	bookingSelect,
	type BookingActor,
	type CreateBookingFailureReason,
	type CreatedBooking
} from './create'

export type CreateRecurringBookingResult =
	| {
			ok: true
			seriesId: string
			bookings: CreatedBooking[]
	  }
	| {
			ok: false
			reason: Exclude<CreateBookingFailureReason, 'slot-taken'>
	  }
	| {
			ok: false
			reason: 'slot-taken'
			conflictingStartAt: Date
	  }

class RoomNotFoundError extends Error {}
class SlotTakenError extends Error {
	constructor(readonly conflictingStartAt: Date) {
		super()
	}
}

export async function createRecurringBooking(
	input: CreateRecurringBookingInput,
	actor: BookingActor,
	now = new Date()
): Promise<CreateRecurringBookingResult> {
	if (!actor.emailVerifiedAt) {
		return {
			ok: false,
			reason: 'email-not-verified'
		}
	}

	const occurrences = Array.from(
		{ length: input.repeatCount },
		(_, index) => ({
			startAt: addOfficeWeeks(input.startAt, index),
			endAt: addOfficeWeeks(input.endAt, index)
		})
	)

	for (const occurrence of occurrences) {
		const validationError = validateBookingTime(
			occurrence.startAt,
			occurrence.endAt,
			now
		)

		if (validationError) {
			return {
				ok: false,
				reason: validationError
			}
		}
	}

	try {
		const result = await prisma.$transaction(async transaction => {
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

			const allSlotStarts = occurrences.flatMap(occurrence =>
				getBookingSlotStarts(occurrence.startAt, occurrence.endAt)
			)

			const existingSlot = await transaction.bookingSlot.findFirst({
				where: {
					roomId: input.roomId,
					startsAt: {
						in: allSlotStarts
					}
				},
				select: {
					startsAt: true
				},
				orderBy: {
					startsAt: 'asc'
				}
			})

			if (existingSlot) {
				throw new SlotTakenError(existingSlot.startsAt)
			}

			const series = await transaction.recurringBookingSeries.create({
				data: {
					weekday: getOfficeWeekday(input.startAt),
					occurrenceCount: input.repeatCount,
					user: {
						connect: {
							id: actor.id
						}
					},
					room: {
						connect: {
							id: input.roomId
						}
					}
				},
				select: {
					id: true
				}
			})

			const bookings: CreatedBooking[] = []

			for (const occurrence of occurrences) {
				let booking: CreatedBooking

				try {
					booking = await transaction.booking.create({
						data: {
							title: input.title,
							startAt: occurrence.startAt,
							endAt: occurrence.endAt,
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
							recurringSeries: {
								connect: {
									id: series.id
								}
							},
							slots: {
								createMany: {
									data: getBookingSlotStarts(
										occurrence.startAt,
										occurrence.endAt
									).map(startsAt => ({
										roomId: input.roomId,
										startsAt
									}))
								}
							}
						},
						select: bookingSelect
					})
				} catch (error) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === 'P2002'
					) {
						throw new SlotTakenError(occurrence.startAt)
					}

					throw error
				}

				bookings.push(booking)
			}

			return {
				seriesId: series.id,
				bookings
			}
		})

		return {
			ok: true,
			...result
		}
	} catch (error) {
		if (error instanceof RoomNotFoundError) {
			return {
				ok: false,
				reason: 'room-not-found'
			}
		}

		if (error instanceof SlotTakenError) {
			return {
				ok: false,
				reason: 'slot-taken',
				conflictingStartAt: error.conflictingStartAt
			}
		}

		throw error
	}
}
