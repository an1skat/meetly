import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	transactionMock,
	roomFindUniqueMock,
	bookingSlotFindFirstMock,
	seriesCreateMock,
	bookingCreateMock
} = vi.hoisted(() => ({
	transactionMock: vi.fn(),
	roomFindUniqueMock: vi.fn(),
	bookingSlotFindFirstMock: vi.fn(),
	seriesCreateMock: vi.fn(),
	bookingCreateMock: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		$transaction: transactionMock
	}
}))

import { Prisma } from '@/generated/prisma/client'
import { createRecurringBooking } from './create-recurring'

const roomId = 'clh4k3j2l0000qwer1234asdf'
const userId = 'clh4k3j2l0001qwer1234asdf'
const seriesId = 'clh4k3j2l0003qwer1234asdf'
const actor = {
	id: userId,
	emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z')
}
const input = {
	roomId,
	title: 'Щотижневе планування',
	startAt: new Date('2026-03-24T08:00:00.000Z'),
	endAt: new Date('2026-03-24T09:00:00.000Z'),
	repeatCount: 2
}
const now = new Date('2026-03-01T00:00:00.000Z')

const transactionClient = {
	room: {
		findUnique: roomFindUniqueMock
	},
	bookingSlot: {
		findFirst: bookingSlotFindFirstMock
	},
	recurringBookingSeries: {
		create: seriesCreateMock
	},
	booking: {
		create: bookingCreateMock
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	roomFindUniqueMock.mockResolvedValue({ id: roomId })
	bookingSlotFindFirstMock.mockResolvedValue(null)
	seriesCreateMock.mockResolvedValue({ id: seriesId })
	bookingCreateMock.mockImplementation(({ data }) =>
		Promise.resolve({
			id: `booking-${bookingCreateMock.mock.calls.length}`,
			title: data.title,
			startAt: data.startAt,
			endAt: data.endAt,
			roomId,
			recurringSeriesId: seriesId,
			user: {
				id: userId,
				name: 'Андрій'
			}
		})
	)
	transactionMock.mockImplementation(
		(callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
			callback(transactionClient)
	)
})

describe('createRecurringBooking', () => {
	it('rejects an unverified user before opening a transaction', async () => {
		await expect(
			createRecurringBooking(
				input,
				{
					...actor,
					emailVerifiedAt: null
				},
				now
			)
		).resolves.toEqual({
			ok: false,
			reason: 'email-not-verified'
		})
		expect(transactionMock).not.toHaveBeenCalled()
	})

	it('returns room-not-found without creating a series', async () => {
		roomFindUniqueMock.mockResolvedValue(null)

		await expect(
			createRecurringBooking(input, actor, now)
		).resolves.toEqual({
			ok: false,
			reason: 'room-not-found'
		})
		expect(seriesCreateMock).not.toHaveBeenCalled()
	})

	it('rejects the whole series when any slot is occupied', async () => {
		const conflictingStartAt = new Date('2026-03-31T07:00:00.000Z')

		bookingSlotFindFirstMock.mockResolvedValue({ startsAt: conflictingStartAt })

		await expect(
			createRecurringBooking(input, actor, now)
		).resolves.toEqual({
			ok: false,
			reason: 'slot-taken',
			conflictingStartAt
		})
		expect(seriesCreateMock).not.toHaveBeenCalled()
		expect(bookingCreateMock).not.toHaveBeenCalled()
	})

	it('creates every occurrence at the same Kyiv wall time atomically', async () => {
		const result = await createRecurringBooking(input, actor, now)

		expect(result).toMatchObject({
			ok: true,
			seriesId,
			bookings: [
				{
					startAt: new Date('2026-03-24T08:00:00.000Z'),
					recurringSeriesId: seriesId
				},
				{
					startAt: new Date('2026-03-31T07:00:00.000Z'),
					recurringSeriesId: seriesId
				}
			]
		})
		expect(seriesCreateMock).toHaveBeenCalledWith({
			data: {
				weekday: 2,
				occurrenceCount: 2,
				user: {
					connect: {
						id: userId
					}
				},
				room: {
					connect: {
						id: roomId
					}
				}
			},
			select: {
				id: true
			}
		})
		expect(bookingSlotFindFirstMock).toHaveBeenCalledWith({
			where: {
				roomId,
				startsAt: {
					in: [
						new Date('2026-03-24T08:00:00.000Z'),
						new Date('2026-03-24T08:30:00.000Z'),
						new Date('2026-03-31T07:00:00.000Z'),
						new Date('2026-03-31T07:30:00.000Z')
					]
				}
			},
			select: {
				startsAt: true
			},
			orderBy: {
				startsAt: 'asc'
			}
		})
		expect(bookingCreateMock).toHaveBeenCalledTimes(2)
		expect(bookingCreateMock.mock.calls[1]?.[0]).toMatchObject({
			data: {
				startAt: new Date('2026-03-31T07:00:00.000Z'),
				endAt: new Date('2026-03-31T08:00:00.000Z'),
				recurringSeries: {
					connect: {
						id: seriesId
					}
				}
			}
		})
	})

	it('maps a concurrent unique slot violation to slot-taken', async () => {
		bookingCreateMock.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
				code: 'P2002',
				clientVersion: '7.9.0',
				meta: {
					target: ['roomId', 'startsAt']
				}
			})
		)

		await expect(
			createRecurringBooking(input, actor, now)
		).resolves.toEqual({
			ok: false,
			reason: 'slot-taken',
			conflictingStartAt: input.startAt
		})
	})
})
