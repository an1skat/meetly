import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
	console.warn(
		'\x1b[33m⚠ TEST_DATABASE_URL is not set — notification integration tests will be skipped\x1b[0m'
	)
}

const describeDatabase = testDatabaseUrl ? describe : describe.skip

let prisma: (typeof import('@/server/db/prisma'))['prisma'] | undefined
let cancelBooking: (typeof import('@/server/bookings/cancel'))['cancelBooking']
	| undefined
let generateNextBookingNotifications:
	| (typeof import('./generate'))['generateNextBookingNotifications']
	| undefined

const marker = randomUUID()
const roomName = `Notification test room ${marker}`
const emails = [
	`notification-current-${marker}@example.com`,
	`notification-next-${marker}@example.com`
]
const now = new Date('2099-08-09T10:00:00.000Z')

let roomId = ''
let currentUserId = ''
let nextUserId = ''

describeDatabase('notification persistence', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = testDatabaseUrl!
		process.env.NOTIFY_BEFORE_MINUTES = '10'

		;({ prisma } = await import('@/server/db/prisma'))
		;({ cancelBooking } = await import('@/server/bookings/cancel'))
		;({ generateNextBookingNotifications } = await import('./generate'))

		const [room, currentUser, nextUser] = await Promise.all([
			prisma.room.create({
				data: {
					name: roomName,
					floor: 1,
					capacity: 4
				}
			}),
			prisma.user.create({
				data: {
					name: 'Поточний користувач',
					email: emails[0],
					passwordHash: 'not-used-in-integration-test',
					emailVerifiedAt: now
				}
			}),
			prisma.user.create({
				data: {
					name: 'Наступний користувач',
					email: emails[1],
					passwordHash: 'not-used-in-integration-test',
					emailVerifiedAt: now
				}
			})
		])

		roomId = room.id
		currentUserId = currentUser.id
		nextUserId = nextUser.id
	})

	afterAll(async () => {
		if (!prisma) {
			return
		}

		await prisma.booking.deleteMany({
			where: {
				roomId
			}
		})
		await prisma.room.deleteMany({
			where: {
				name: roomName
			}
		})
		await prisma.user.deleteMany({
			where: {
				email: {
					in: emails
				}
			}
		})
		await prisma.$disconnect()
	})

	it('creates one notification and removes it when the next booking is cancelled', async () => {
		if (!prisma || !cancelBooking || !generateNextBookingNotifications) {
			throw new Error('Integration test was not initialized')
		}

		const currentBooking = await prisma.booking.create({
			data: {
				title: 'Поточна зустріч',
				startAt: new Date('2099-08-09T09:30:00.000Z'),
				endAt: new Date('2099-08-09T10:10:00.000Z'),
				userId: currentUserId,
				roomId
			}
		})
		const nextBooking = await prisma.booking.create({
			data: {
				title: 'Наступна зустріч',
				startAt: currentBooking.endAt,
				endAt: new Date('2099-08-09T10:40:00.000Z'),
				userId: nextUserId,
				roomId
			}
		})

		await expect(generateNextBookingNotifications(now)).resolves.toBe(1)
		await expect(generateNextBookingNotifications(now)).resolves.toBe(0)
		await expect(
			prisma.notification.count({
				where: {
					currentBookingId: currentBooking.id,
					nextBookingId: nextBooking.id
				}
			})
		).resolves.toBe(1)

		await expect(
			cancelBooking(nextBooking.id, nextUserId, 'occurrence', now)
		).resolves.toEqual({ ok: true })
		await expect(
			prisma.notification.count({
				where: {
					currentBookingId: currentBooking.id
				}
			})
		).resolves.toBe(0)
	})
})
