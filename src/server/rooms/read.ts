import { prisma } from '@/server/db/prisma'

const roomSelect = {
	id: true,
	name: true,
	floor: true,
	capacity: true
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
