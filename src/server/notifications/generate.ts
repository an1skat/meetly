import { NotificationType } from '@/generated/prisma/client'
import { env } from '@/lib/env'
import { prisma } from '@/server/db/prisma'

export async function generateNextBookingNotifications(now = new Date()) {
	const windowEnd = new Date(now.getTime() + env.NOTIFY_BEFORE_MINUTES * 60_000)

	const currentBookings = await prisma.booking.findMany({
		where: {
			startAt: {
				lte: now
			},
			endAt: {
				gt: now,
				lte: windowEnd
			}
		},
		select: {
			id: true,
			userId: true,
			roomId: true,
			endAt: true
		}
	})

	const candidates = await Promise.all(
		currentBookings.map(async currentBooking => {
			const nextBooking = await prisma.booking.findFirst({
				where: {
					roomId: currentBooking.roomId,
					startAt: currentBooking.endAt
				},
				select: {
					id: true
				}
			})

			if (!nextBooking) {
				return null
			}

			return {
				type: NotificationType.NEXT_BOOKING,
				userId: currentBooking.userId,
				currentBookingId: currentBooking.id,
				nextBookingId: nextBooking.id
			}
		})
	)

	const notifications = candidates.filter(candidate => candidate !== null)

	if (notifications.length === 0) {
		return 0
	}

	const result = await prisma.notification.createMany({
		data: notifications,
		skipDuplicates: true
	})

	return result.count
}
