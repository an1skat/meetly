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
					name: true
				}
			}
		},
		orderBy: {
			startAt: 'asc'
		}
	}
} as const

export async function getRooms() {
	return prisma.room.findMany({
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

export async function getRoomsWithBookings() {
	return prisma.room.findMany({
		select: roomScheduleSelect,
		orderBy: [{ floor: 'asc' }, { name: 'asc' }]
	})
}
