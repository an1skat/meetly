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

import { getRoomById, getRooms, getRoomsWithBookings } from './read'

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
			where: undefined,
			select: {
				id: true,
				name: true,
				floor: true,
				capacity: true
			},
			orderBy: [{ floor: 'asc' }, { name: 'asc' }]
		})
	})

	it('filters rooms by minimum capacity', async () => {
		findMany.mockResolvedValue([room])

		await expect(getRooms(6)).resolves.toEqual([room])
		expect(findMany).toHaveBeenCalledWith({
			where: { capacity: { gte: 6 } },
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

	it('returns rooms with schedule-safe booking details', async () => {
		const currentUserId = 'cm1currentuser000000000001'
		const ownBooking = {
			id: 'cm1ownbooking000000000001',
			title: 'Приватна розмова',
			startAt: new Date('2026-08-04T07:00:00.000Z'),
			endAt: new Date('2026-08-04T08:00:00.000Z'),
			user: { id: currentUserId, name: 'Андрій' }
		}
		const foreignBooking = {
			id: 'cm1foreignbooking00000001',
			title: 'Конфіденційна тема',
			startAt: new Date('2026-08-04T08:00:00.000Z'),
			endAt: new Date('2026-08-04T09:00:00.000Z'),
			user: { id: 'cm1otheruser0000000000001', name: 'Павло' }
		}

		findMany.mockResolvedValue([
			{ ...room, bookings: [ownBooking, foreignBooking] }
		])

		await expect(getRoomsWithBookings(currentUserId)).resolves.toEqual([
			{
				...room,
				bookings: [
					{
						...ownBooking,
						isOwn: true,
						user: { name: 'Андрій' }
					},
					{
						...foreignBooking,
						title: 'Зайнято',
						isOwn: false,
						user: { name: 'Павло' }
					}
				]
			}
		])
		expect(findMany).toHaveBeenCalledWith({
			select: {
				id: true,
				name: true,
				floor: true,
				capacity: true,
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
			},
			orderBy: [{ floor: 'asc' }, { name: 'asc' }]
		})
	})
})
