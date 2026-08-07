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

const myBookingSelect = {
	id: true,
	title: true,
	startAt: true,
	endAt: true,
	room: {
		select: {
			id: true,
			name: true
		}
	}
} satisfies Prisma.BookingSelect

export const PAST_BOOKINGS_PAGE_SIZE = 10

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

export async function getMyBookings(
	userId: string,
	type: 'upcoming' | 'past',
	page = 1,
	now = new Date()
) {
	if (type === 'upcoming') {
		const bookings = await prisma.booking.findMany({
			where: {
				userId,
				endAt: {
					gt: now
				}
			},
			select: myBookingSelect,
			orderBy: {
				startAt: 'asc'
			}
		})

		return {
			bookings: bookings.map(booking => ({
				...booking,
				canCancel: booking.startAt > now
			})),
			pagination: null
		}
	}

	const where = {
		userId,
		endAt: {
			lte: now
		}
	}

	const [bookings, total] = await Promise.all([
		prisma.booking.findMany({
			where,
			select: myBookingSelect,
			orderBy: {
				startAt: 'desc'
			},
			skip: (page - 1) * PAST_BOOKINGS_PAGE_SIZE,
			take: PAST_BOOKINGS_PAGE_SIZE
		}),
		prisma.booking.count({ where })
	])

	return {
		bookings: bookings.map(booking => ({
			...booking,
			canCancel: false
		})),
		pagination: {
			page,
			pageSize: PAST_BOOKINGS_PAGE_SIZE,
			total,
			totalPages: Math.ceil(total / PAST_BOOKINGS_PAGE_SIZE)
		}
	}
}