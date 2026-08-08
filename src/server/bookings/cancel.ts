import type { CancelBookingScope } from '@/modules/bookings/schemas'
import { prisma } from '@/server/db/prisma'

export type CancelBookingResult =
	| { ok: true }
	| {
			ok: false
			reason: 'not-found' | 'forbidden' | 'past'
	  }

export async function cancelBooking(
	bookingId: string,
	userId: string,
	scope: CancelBookingScope = 'occurrence',
	now = new Date()
): Promise<CancelBookingResult> {
	return prisma.$transaction(async transaction => {
		const booking = await transaction.booking.findUnique({
			where: { id: bookingId },
			select: {
				userId: true,
				startAt: true,
				recurringSeriesId: true
			}
		})

		if (!booking) {
			return {
				ok: false,
				reason: 'not-found'
			} as const
		}

		if (booking.userId !== userId) {
			return {
				ok: false,
				reason: 'forbidden'
			} as const
		}

		if (booking.startAt <= now) {
			return {
				ok: false,
				reason: 'past'
			} as const
		}

		if (scope === 'series' && booking.recurringSeriesId) {
			const futureBookings = await transaction.booking.findMany({
				where: {
					recurringSeriesId: booking.recurringSeriesId,
					userId,
					startAt: {
						gt: now
					}
				},
				select: {
					id: true
				}
			})

			const bookingIds = futureBookings.map(item => item.id)

			if (bookingIds.length > 0) {
				await transaction.bookingSlot.deleteMany({
					where: {
						bookingId: {
							in: bookingIds
						}
					}
				})

				await transaction.booking.deleteMany({
					where: {
						id: {
							in: bookingIds
						}
					}
				})
			}

			return { ok: true } as const
		}

		await transaction.bookingSlot.deleteMany({
			where: { bookingId }
		})

		await transaction.booking.delete({
			where: { id: bookingId }
		})

		return { ok: true } as const
	})
}
