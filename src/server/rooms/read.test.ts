import { afterEach, describe, expect, it, vi } from 'vitest'

const { findMany, findUnique } = vi.hoisted(() => ({
	findMany: vi.fn(),
	findUnique: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		room: {
			findMany,
			findUnique
		}
	}
}))

import { getRoomById, getRooms } from './read'

const room = {
	id: 'clh4k3j2l0000qwer1234asdf',
	name: 'Акваріум',
	floor: 1,
	capacity: 4
}

afterEach(() => {
	vi.clearAllMocks()
})

describe('room reads', () => {
	it('returns ordered rooms with public fields', async () => {
		findMany.mockResolvedValue([room])

		await expect(getRooms()).resolves.toEqual([room])
		expect(findMany).toHaveBeenCalledWith({
			select: {
				id: true,
				name: true,
				floor: true,
				capacity: true
			},
			orderBy: [{ floor: 'asc' }, { name: 'asc' }]
		})
	})

	it('returns a room by id with public fields', async () => {
		findUnique.mockResolvedValue(room)

		await expect(getRoomById(room.id)).resolves.toEqual(room)
		expect(findUnique).toHaveBeenCalledWith({
			where: { id: room.id },
			select: {
				id: true,
				name: true,
				floor: true,
				capacity: true
			}
		})
	})
})
