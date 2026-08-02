import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeDatabase = testDatabaseUrl ? describe : describe.skip

let prisma: (typeof import('@/server/db/prisma'))['prisma'] | undefined

let createBooking: (typeof import('./create'))['createBooking'] | undefined

const marker = randomUUID()
const roomName = `Race test room ${marker}`
const emails = [
	`race-first-${marker}@example.com`,
	`race-second-${marker}@example.com`
]

let roomId = ''
let userIds: string[] = []

describeDatabase('booking concurrency', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = testDatabaseUrl!
		;({ prisma } = await import('@/server/db/prisma'))
		;({ createBooking } = await import('./create'))

		const [room, firstUser, secondUser] = await Promise.all([
			prisma.room.create({
				data: {
					name: roomName,
					floor: 1,
					capacity: 4
				}
			}),
			prisma.user.create({
				data: {
					name: 'Перший користувач',
					email: emails[0],
					passwordHash: 'not-used-in-integration-test'
				}
			}),
			prisma.user.create({
				data: {
					name: 'Другий користувач',
					email: emails[1],
					passwordHash: 'not-used-in-integration-test'
				}
			})
		])

		roomId = room.id
		userIds = [firstUser.id, secondUser.id]
	})

	afterAll(async () => {
		if (!prisma) {
			return
		}

		const room = await prisma.room.findUnique({
			where: {
				name: roomName
			}
		})

		if (room) {
			await prisma.booking.deleteMany({
				where: {
					roomId: room.id
				}
			})

			await prisma.room.delete({
				where: {
					id: room.id
				}
			})
		}

		await prisma.user.deleteMany({
			where: {
				email: {
					in: emails
				}
			}
		})

		await prisma.$disconnect()
	})

	it('stores exactly one booking when two requests target the same slots', async () => {
		if (!prisma || !createBooking) {
			throw new Error('Integration test was not initialized')
		}

		const input = {
			roomId,
			title: 'Конкурентне бронювання',
			startAt: new Date('2099-07-01T06:00:00.000Z'),
			endAt: new Date('2099-07-01T07:30:00.000Z')
		}

		const results = await Promise.all([
			createBooking(input, userIds[0]),
			createBooking(input, userIds[1])
		])

		expect(results.filter(result => result.ok)).toHaveLength(1)
		expect(results.filter(result => !result.ok)).toEqual([
			{
				ok: false,
				reason: 'slot-taken'
			}
		])

		await expect(
			prisma.booking.count({
				where: {
					roomId
				}
			})
		).resolves.toBe(1)

		await expect(
			prisma.bookingSlot.count({
				where: {
					roomId
				}
			})
		).resolves.toBe(3)
	})
})
