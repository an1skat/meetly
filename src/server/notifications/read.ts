import { prisma } from '@/server/db/prisma'

export async function getUnreadNotifications(userId: string) {
	return prisma.notification.findMany({
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
}

export async function markNotificationRead(id: string, userId: string) {
	const result = await prisma.notification.updateMany({
		where: {
			id,
			userId,
			readAt: null
		},
		data: {
			readAt: new Date()
		}
	})

	return result.count > 0
}
