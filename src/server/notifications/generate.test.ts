import { NotificationType } from '@/generated/prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	bookingFindManyMock,
	bookingFindFirstMock,
	notificationCreateManyMock
} = vi.hoisted(() => ({
	bookingFindManyMock: vi.fn(),
	bookingFindFirstMock: vi.fn(),
	notificationCreateManyMock: vi.fn()
}))

vi.mock('@/lib/env', () => ({
	env: {
		DATABASE_URL: 'postgresql://unused',
		NOTIFY_BEFORE_MINUTES: 10
	}
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		booking: {
			findMany: bookingFindManyMock,
			findFirst: bookingFindFirstMock
		},
		notification: {
			createMany: notificationCreateManyMock
		}
	}
}))

import { generateNextBookingNotifications } from './generate'

const now = new Date('2026-08-09T10:00:00.000Z')
const currentBooking = {
	id: 'cm1currentbooking000000001',
	userId: 'cm1currentuser00000000001',
	roomId: 'cm1room000000000000000001',
	endAt: new Date('2026-08-09T10:10:00.000Z')
}
const nextBooking = {
	id: 'cm1nextbooking000000000001'
}

beforeEach(() => {
	vi.resetAllMocks()
	bookingFindManyMock.mockResolvedValue([currentBooking])
	bookingFindFirstMock.mockResolvedValue(nextBooking)
	notificationCreateManyMock.mockResolvedValue({ count: 1 })
})

describe('generateNextBookingNotifications', () => {
	it('creates one notification for an adjacent booking in the configured window', async () => {
		await expect(generateNextBookingNotifications(now)).resolves.toBe(1)

		expect(bookingFindManyMock).toHaveBeenCalledWith({
			where: {
				startAt: {
					lte: now
				},
				endAt: {
					gt: now,
					lte: new Date('2026-08-09T10:10:00.000Z')
				}
			},
			select: {
				id: true,
				userId: true,
				roomId: true,
				endAt: true
			}
		})
		expect(bookingFindFirstMock).toHaveBeenCalledWith({
			where: {
				roomId: currentBooking.roomId,
				startAt: currentBooking.endAt
			},
			select: {
				id: true
			}
		})
		expect(notificationCreateManyMock).toHaveBeenCalledWith({
			data: [
				{
					type: NotificationType.NEXT_BOOKING,
					userId: currentBooking.userId,
					currentBookingId: currentBooking.id,
					nextBookingId: nextBooking.id
				}
			],
			skipDuplicates: true
		})
	})

	it('does not create a notification without an adjacent booking', async () => {
		bookingFindFirstMock.mockResolvedValue(null)

		await expect(generateNextBookingNotifications(now)).resolves.toBe(0)

		expect(notificationCreateManyMock).not.toHaveBeenCalled()
	})

	it('returns the database count when the notification already exists', async () => {
		notificationCreateManyMock.mockResolvedValue({ count: 0 })

		await expect(generateNextBookingNotifications(now)).resolves.toBe(0)
	})
})
