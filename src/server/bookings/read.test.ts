import { afterEach, describe, expect, it, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({
	findMany: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		booking: { findMany }
	}
}))

import { getRoomBookings } from './read'

afterEach(() => {
	vi.clearAllMocks()
})

describe('getRoomBookings', () => {
	it('returns only overlapping room bookings and hides foreign titles', async () => {
		const currentUserId = 'cm1currentuser000000000001'
		const from = new Date('2026-08-03T00:00:00.000Z')
		const to = new Date('2026-08-10T00:00:00.000Z')

		findMany.mockResolvedValue([
			{
				id: 'cm1ownbooking000000000001',
				title: 'Планування',
				startAt: new Date('2026-08-04T07:00:00.000Z'),
				endAt: new Date('2026-08-04T08:00:00.000Z'),
				user: { id: currentUserId, name: 'Андрій' }
			},
			{
				id: 'cm1foreignbooking00000001',
				title: 'Конфіденційна тема',
				startAt: new Date('2026-08-05T07:00:00.000Z'),
				endAt: new Date('2026-08-05T08:00:00.000Z'),
				user: { id: 'cm1otheruser0000000000001', name: 'Павло' }
			}
		])

		await expect(
			getRoomBookings('clh4k3j2l0000qwer1234asdf', from, to, currentUserId)
		).resolves.toEqual([
			{
				id: 'cm1ownbooking000000000001',
				title: 'Планування',
				startAt: new Date('2026-08-04T07:00:00.000Z'),
				endAt: new Date('2026-08-04T08:00:00.000Z'),
				authorName: 'Андрій',
				isOwn: true
			},
			{
				id: 'cm1foreignbooking00000001',
				title: 'Зайнято',
				startAt: new Date('2026-08-05T07:00:00.000Z'),
				endAt: new Date('2026-08-05T08:00:00.000Z'),
				authorName: 'Павло',
				isOwn: false
			}
		])

		expect(findMany).toHaveBeenCalledWith({
			where: {
				roomId: 'clh4k3j2l0000qwer1234asdf',
				startAt: { lt: to },
				endAt: { gt: from }
			},
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
			orderBy: { startAt: 'asc' }
		})
	})
})
