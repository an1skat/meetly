import { beforeEach, describe, expect, it, vi } from 'vitest'

const { transactionMock, roomFindUniqueMock, bookingCreateMock } = vi.hoisted(
	() => ({
		transactionMock: vi.fn(),
		roomFindUniqueMock: vi.fn(),
		bookingCreateMock: vi.fn()
	})
)

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		$transaction: transactionMock
	}
}))

import { Prisma } from '@/generated/prisma/client'
import { createBooking } from './create'

const roomId = 'clh4k3j2l0000qwer1234asdf'
const userId = 'clh4k3j2l0001qwer1234asdf'
const actor = {
	id: userId,
	emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z')
}

const input = {
	roomId,
	title: 'Планування',
	startAt: new Date('2099-07-01T06:00:00.000Z'),
	endAt: new Date('2099-07-01T07:30:00.000Z')
}

const booking = {
	id: 'clh4k3j2l0002qwer1234asdf',
	title: input.title,
	startAt: input.startAt,
	endAt: input.endAt,
	roomId,
	recurringSeriesId: null,
	user: {
		id: userId,
		name: 'Андрій'
	}
}

const transactionClient = {
	room: {
		findUnique: roomFindUniqueMock
	},
	booking: {
		create: bookingCreateMock
	}
}

beforeEach(() => {
	vi.resetAllMocks()

	roomFindUniqueMock.mockResolvedValue({ id: roomId })
	bookingCreateMock.mockResolvedValue(booking)
	transactionMock.mockImplementation(
		(callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
			callback(transactionClient)
	)
})

describe('createBooking', () => {
	it('validates time before opening a transaction', async () => {
		const result = await createBooking(
			{
				...input,
				startAt: new Date('2099-07-01T07:00:00.000Z'),
				endAt: new Date('2099-07-01T06:30:00.000Z')
			},
			actor
		)

		expect(result).toEqual({
			ok: false,
			reason: 'order'
		})
		expect(transactionMock).not.toHaveBeenCalled()
	})

	it('rejects an unverified user before opening a transaction', async () => {
		const result = await createBooking(input, {
			...actor,
			emailVerifiedAt: null
		})

		expect(result).toEqual({
			ok: false,
			reason: 'email-not-verified'
		})
		expect(transactionMock).not.toHaveBeenCalled()
	})

	it('returns room-not-found without creating a booking', async () => {
		roomFindUniqueMock.mockResolvedValue(null)

		const result = await createBooking(input, actor)

		expect(result).toEqual({
			ok: false,
			reason: 'room-not-found'
		})
		expect(bookingCreateMock).not.toHaveBeenCalled()
	})

	it('creates the booking and every occupied slot atomically', async () => {
		const result = await createBooking(input, actor)

		expect(result).toEqual({
			ok: true,
			booking
		})

		expect(roomFindUniqueMock).toHaveBeenCalledWith({
			where: {
				id: roomId
			},
			select: {
				id: true
			}
		})

		expect(bookingCreateMock).toHaveBeenCalledWith({
			data: {
				title: input.title,
				startAt: input.startAt,
				endAt: input.endAt,
				user: {
					connect: {
						id: actor.id
					}
				},
				room: {
					connect: {
						id: roomId
					}
				},
				slots: {
					createMany: {
						data: [
							{
								roomId,
								startsAt: new Date('2099-07-01T06:00:00.000Z')
							},
							{
								roomId,
								startsAt: new Date('2099-07-01T06:30:00.000Z')
							},
							{
								roomId,
								startsAt: new Date('2099-07-01T07:00:00.000Z')
							}
						]
					}
				}
			},
			select: {
				id: true,
				title: true,
				startAt: true,
				endAt: true,
				roomId: true,
				recurringSeriesId: true,
				user: {
					select: {
						id: true,
						name: true
					}
				}
			}
		})
	})

	it('maps a unique slot violation to slot-taken', async () => {
		transactionMock.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
				code: 'P2002',
				clientVersion: '7.9.0',
				meta: {
					target: ['roomId', 'startsAt']
				}
			})
		)

		await expect(createBooking(input, actor)).resolves.toEqual({
			ok: false,
			reason: 'slot-taken'
		})
	})

	it('does not hide unexpected database errors', async () => {
		transactionMock.mockRejectedValue(new Error('Database unavailable'))

		await expect(createBooking(input, actor)).rejects.toThrow(
			'Database unavailable'
		)
	})
})
