import { prisma } from '@/server/db/prisma'

export type CancelBookingResult =
	| { ok: true }
	| { ok: false; reason: 'not-found' | 'forbidden' }

export async function cancelBooking(
	bookingId: string,
	userId: string
): Promise<CancelBookingResult> {
	return prisma.$transaction(async transaction => {
		const booking = await transaction.booking.findUnique({
			where: { id: bookingId },
			select: { userId: true }
		})

		if (!booking) {
			return { ok: false, reason: 'not-found' } as const
		}

		if (booking.userId !== userId) {
			return { ok: false, reason: 'forbidden' } as const
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
