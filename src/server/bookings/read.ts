import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/server/db/prisma'

const scheduleBookingSelect = {
	id: true,
	title: true,
	startAt: true,
	endAt: true,
	user: {
		select: {
			id: true,
			name: true
		}
	}
} satisfies Prisma.BookingSelect

export async function getRoomBookings(
	roomId: string,
	from: Date,
	to: Date,
	currentUserId: string
) {
	const bookings = await prisma.booking.findMany({
		where: {
			roomId,
			startAt: { lt: to },
			endAt: { gt: from }
		},
		select: scheduleBookingSelect,
		orderBy: { startAt: 'asc' }
	})

	return bookings.map(booking => {
		const isOwn = booking.user.id === currentUserId

		return {
			id: booking.id,
			title: isOwn ? booking.title : 'Зайнято',
			startAt: booking.startAt,
			endAt: booking.endAt,
			authorName: booking.user.name,
			isOwn
		}
	})
}
