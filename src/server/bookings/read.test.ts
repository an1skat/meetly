import { afterEach, describe, expect, it, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({
	findMany: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		booking: { findMany }
	}
}))

import { getMyBookings, getRoomBookings } from './read'

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
				recurringSeriesId: 'cm1series0000000000000001',
				user: { id: currentUserId, name: 'Андрій' }
			},
			{
				id: 'cm1foreignbooking00000001',
				title: 'Конфіденційна тема',
				startAt: new Date('2026-08-05T07:00:00.000Z'),
				endAt: new Date('2026-08-05T08:00:00.000Z'),
				recurringSeriesId: 'cm1foreignseries000000001',
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
				isOwn: true,
				recurringSeriesId: 'cm1series0000000000000001'
			},
			{
				id: 'cm1foreignbooking00000001',
				title: 'Зайнято',
				startAt: new Date('2026-08-05T07:00:00.000Z'),
				endAt: new Date('2026-08-05T08:00:00.000Z'),
				authorName: 'Павло',
				isOwn: false,
				recurringSeriesId: null
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
				recurringSeriesId: true,
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

describe('getMyBookings', () => {
	it('includes the recurring series id in upcoming bookings', async () => {
		const now = new Date('2026-08-01T00:00:00.000Z')
		const recurringSeriesId = 'cm1series0000000000000001'

		findMany.mockResolvedValue([
			{
				id: 'cm1ownbooking000000000001',
				title: 'Планування',
				startAt: new Date('2026-08-04T07:00:00.000Z'),
				endAt: new Date('2026-08-04T08:00:00.000Z'),
				recurringSeriesId,
				room: {
					id: 'clh4k3j2l0000qwer1234asdf',
					name: 'Акваріум'
				}
			}
		])

		await expect(
			getMyBookings('cm1currentuser000000000001', 'upcoming', 1, now)
		).resolves.toEqual({
			bookings: [
				{
					id: 'cm1ownbooking000000000001',
					title: 'Планування',
					startAt: new Date('2026-08-04T07:00:00.000Z'),
					endAt: new Date('2026-08-04T08:00:00.000Z'),
					recurringSeriesId,
					room: {
						id: 'clh4k3j2l0000qwer1234asdf',
						name: 'Акваріум'
					},
					canCancel: true
				}
			],
			pagination: null
		})
	})
})
