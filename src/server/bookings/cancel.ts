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
	now = new Date()
): Promise<CancelBookingResult> {
	return prisma.$transaction(async transaction => {
		const booking = await transaction.booking.findUnique({
			where: { id: bookingId },
			select: {
				userId: true,
				startAt: true
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

		await transaction.bookingSlot.deleteMany({
			where: { bookingId }
		})

		await transaction.booking.delete({
			where: { id: bookingId }
		})

		return { ok: true } as const
	})
}
