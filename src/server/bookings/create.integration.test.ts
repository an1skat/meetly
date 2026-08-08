import { randomUUID } from 'node:crypto'
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
	console.warn(
		'\x1b[33m⚠ TEST_DATABASE_URL is not set — booking integration tests will be skipped\x1b[0m'
	)
}

const describeDatabase = testDatabaseUrl ? describe : describe.skip

let prisma: (typeof import('@/server/db/prisma'))['prisma'] | undefined

let createBooking: (typeof import('./create'))['createBooking'] | undefined
let cancelBooking: (typeof import('./cancel'))['cancelBooking'] | undefined

const marker = randomUUID()
const roomName = `Race test room ${marker}`
const emails = [
	`race-first-${marker}@example.com`,
	`race-second-${marker}@example.com`
]
const emailVerifiedAt = new Date('2026-01-01T00:00:00.000Z')

let roomId = ''
let actors: Array<{
	id: string
	emailVerifiedAt: Date
}> = []

describeDatabase('booking concurrency', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = testDatabaseUrl!
		;({ prisma } = await import('@/server/db/prisma'))
		;({ createBooking } = await import('./create'))
		;({ cancelBooking } = await import('./cancel'))

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
					passwordHash: 'not-used-in-integration-test',
					emailVerifiedAt
				}
			}),
			prisma.user.create({
				data: {
					name: 'Другий користувач',
					email: emails[1],
					passwordHash: 'not-used-in-integration-test',
					emailVerifiedAt
				}
			})
		])

		roomId = room.id
		actors = [
			{ id: firstUser.id, emailVerifiedAt },
			{ id: secondUser.id, emailVerifiedAt }
		]
	})

	beforeEach(async () => {
		if (!prisma) {
			return
		}

		await prisma.booking.deleteMany({
			where: {
				roomId
			}
		})
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

	it('creates a valid booking', async () => {
		if (!prisma || !createBooking) {
			throw new Error('Integration test was not initialized')
		}

		const result = await createBooking(
			{
				roomId,
				title: 'Планування',
				startAt: new Date('2099-07-01T06:00:00.000Z'),
				endAt: new Date('2099-07-01T07:00:00.000Z')
			},
			actors[0]
		)

		expect(result.ok).toBe(true)

		await expect(
			prisma.booking.count({ where: { roomId } })
		).resolves.toBe(1)
	})

	it('cancels an owned booking', async () => {
		if (!prisma || !createBooking || !cancelBooking) {
			throw new Error('Integration test was not initialized')
		}

		const created = await createBooking(
			{
				roomId,
				title: 'Owned booking',
				startAt: new Date('2099-07-02T06:00:00.000Z'),
				endAt: new Date('2099-07-02T07:00:00.000Z')
			},
			actors[0]
		)

		if (!created.ok) {
			throw new Error('Booking was not created')
		}

		await expect(
			cancelBooking(created.booking.id, actors[0].id)
		).resolves.toEqual({ ok: true })

		await expect(
			prisma.booking.findUnique({
				where: { id: created.booking.id }
			})
		).resolves.toBeNull()
	})

	it('forbids cancelling another user booking', async () => {
		if (!prisma || !createBooking || !cancelBooking) {
			throw new Error('Integration test was not initialized')
		}

		const created = await createBooking(
			{
				roomId,
				title: 'Foreign booking',
				startAt: new Date('2099-07-03T06:00:00.000Z'),
				endAt: new Date('2099-07-03T07:00:00.000Z')
			},
			actors[0]
		)

		if (!created.ok) {
			throw new Error('Booking was not created')
		}

		await expect(
			cancelBooking(created.booking.id, actors[1].id)
		).resolves.toEqual({
			ok: false,
			reason: 'forbidden'
		})

		await expect(
			prisma.booking.findUnique({
				where: { id: created.booking.id }
			})
		).resolves.not.toBeNull()
	})

	it('rejects a booking in the past', async () => {
		if (!createBooking) {
			throw new Error('Integration test was not initialized')
		}

		await expect(
			createBooking(
				{
					roomId,
					title: 'Past booking',
					startAt: new Date('2020-07-01T06:00:00.000Z'),
					endAt: new Date('2020-07-01T07:00:00.000Z')
				},
				actors[0]
			)
		).resolves.toEqual({
			ok: false,
			reason: 'past'
		})
	})

	it('rejects a booking outside office hours', async () => {
		if (!createBooking) {
			throw new Error('Integration test was not initialized')
		}

		await expect(
			createBooking(
				{
					roomId,
					title: 'Too early',
					startAt: new Date('2099-07-01T05:30:00.000Z'),
					endAt: new Date('2099-07-01T06:30:00.000Z')
				},
				actors[0]
			)
		).resolves.toEqual({
			ok: false,
			reason: 'office-hours'
		})
	})

	it('rejects overlapping occupied slots', async () => {
		if (!createBooking) {
			throw new Error('Integration test was not initialized')
		}

		const first = await createBooking(
			{
				roomId,
				title: 'First',
				startAt: new Date('2099-07-04T06:00:00.000Z'),
				endAt: new Date('2099-07-04T07:00:00.000Z')
			},
			actors[0]
		)

		expect(first.ok).toBe(true)

		await expect(
			createBooking(
				{
					roomId,
					title: 'Second',
					startAt: new Date('2099-07-04T06:30:00.000Z'),
					endAt: new Date('2099-07-04T07:30:00.000Z')
				},
				actors[1]
			)
		).resolves.toEqual({
			ok: false,
			reason: 'slot-taken'
		})
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
			createBooking(input, actors[0]),
			createBooking(input, actors[1])
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
