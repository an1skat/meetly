import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findManyMock, updateManyMock } = vi.hoisted(() => ({
	findManyMock: vi.fn(),
	updateManyMock: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		notification: {
			findMany: findManyMock,
			updateMany: updateManyMock
		}
	}
}))

import { getUnreadNotifications, markNotificationRead } from './read'

const userId = 'cm1currentuser00000000001'
const notificationId = 'cm1notification00000000001'

beforeEach(() => {
	vi.resetAllMocks()
})

describe('notification reads', () => {
	it('returns only the current user unread notifications', async () => {
		const notifications = [
			{
				id: notificationId,
				currentBooking: {
					title: 'Планування',
					room: {
						name: 'Акваріум'
					}
				}
			}
		]

		findManyMock.mockResolvedValue(notifications)

		await expect(getUnreadNotifications(userId)).resolves.toEqual(
			notifications
		)
		expect(findManyMock).toHaveBeenCalledWith({
			where: {
				userId,
				readAt: null
			},
			select: {
				id: true,
				currentBooking: {
					select: {
						title: true,
						room: {
							select: {
								name: true
							}
						}
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})
	})

	it('marks only an owned unread notification as read', async () => {
		updateManyMock.mockResolvedValue({ count: 1 })

		await expect(
			markNotificationRead(notificationId, userId)
		).resolves.toBe(true)
		expect(updateManyMock).toHaveBeenCalledWith({
			where: {
				id: notificationId,
				userId,
				readAt: null
			},
			data: {
				readAt: expect.any(Date)
			}
		})
	})

	it('reports that a missing or foreign notification was not updated', async () => {
		updateManyMock.mockResolvedValue({ count: 0 })

		await expect(
			markNotificationRead(notificationId, userId)
		).resolves.toBe(false)
	})
})
