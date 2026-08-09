import { prisma } from '@/server/db/prisma'

const roomSelect = {
	id: true,
	name: true,
	floor: true,
	capacity: true
} as const

const roomScheduleSelect = {
	...roomSelect,
	bookings: {
		select: {
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
		},
		orderBy: {
			startAt: 'asc'
		}
	}
} as const

export async function getRooms(minCapacity?: number) {
	return prisma.room.findMany({
		where: minCapacity !== undefined ? { capacity: { gte: minCapacity } } : undefined,
		select: roomSelect,
		orderBy: [{ floor: 'asc' }, { name: 'asc' }]
	})
}

export async function getRoomById(id: string) {
	return prisma.room.findUnique({
		where: { id },
		select: roomSelect
	})
}

export async function getRoomsWithBookings(currentUserId: string) {
	const rooms = await prisma.room.findMany({
		select: roomScheduleSelect,
		orderBy: [{ floor: 'asc' }, { name: 'asc' }]
	})

	return rooms.map(room => ({
		...room,
		bookings: room.bookings.map(booking => {
			const isOwn = booking.user.id === currentUserId

			return {
				...booking,
				title: isOwn ? booking.title : 'Зайнято',
				isOwn,
				user: {
					name: booking.user.name
				}
			}
		})
	}))
}
