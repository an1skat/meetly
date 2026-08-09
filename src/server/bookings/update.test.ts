import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	transactionMock,
	bookingFindUniqueMock,
	roomFindUniqueMock,
	bookingSlotDeleteManyMock,
	bookingUpdateMock
} = vi.hoisted(() => ({
	transactionMock: vi.fn(),
	bookingFindUniqueMock: vi.fn(),
	roomFindUniqueMock: vi.fn(),
	bookingSlotDeleteManyMock: vi.fn(),
	bookingUpdateMock: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		$transaction: transactionMock
	}
}))

import { Prisma } from '@/generated/prisma/client'
import { updateBooking } from './update'

const bookingId = 'clh4k3j2l0002qwer1234asdf'
const roomId = 'clh4k3j2l0000qwer1234asdf'
const userId = 'clh4k3j2l0001qwer1234asdf'
const now = new Date('2099-06-01T00:00:00.000Z')
const input = {
	roomId,
	title: 'Оновлене планування',
	startAt: new Date('2099-07-01T06:00:00.000Z'),
	endAt: new Date('2099-07-01T07:30:00.000Z')
}
const booking = {
	id: bookingId,
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
	booking: {
		findUnique: bookingFindUniqueMock,
		update: bookingUpdateMock
	},
	bookingSlot: {
		deleteMany: bookingSlotDeleteManyMock
	},
	room: {
		findUnique: roomFindUniqueMock
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	bookingFindUniqueMock.mockResolvedValue({
		userId,
		startAt: new Date('2099-06-15T06:00:00.000Z')
	})
	roomFindUniqueMock.mockResolvedValue({ id: roomId })
	bookingSlotDeleteManyMock.mockResolvedValue({ count: 2 })
	bookingUpdateMock.mockResolvedValue(booking)
	transactionMock.mockImplementation(
		(callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
			callback(transactionClient)
	)
})

describe('updateBooking', () => {
	it('validates the new time before opening a transaction', async () => {
		const result = await updateBooking(
			bookingId,
			{ ...input, endAt: input.startAt },
			userId,
			now
		)

		expect(result).toEqual({ ok: false, reason: 'order' })
		expect(transactionMock).not.toHaveBeenCalled()
	})

	it('returns not-found without changing slots', async () => {
		bookingFindUniqueMock.mockResolvedValue(null)

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'not-found' })
		expect(bookingSlotDeleteManyMock).not.toHaveBeenCalled()
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('forbids editing another user booking', async () => {
		bookingFindUniqueMock.mockResolvedValue({
			userId: 'another-user-id',
			startAt: new Date('2099-06-15T06:00:00.000Z')
		})

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'forbidden' })
		expect(bookingSlotDeleteManyMock).not.toHaveBeenCalled()
	})

	it('does not edit a booking that has already started', async () => {
		bookingFindUniqueMock.mockResolvedValue({
			userId,
			startAt: now
		})

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'booking-started' })
		expect(bookingSlotDeleteManyMock).not.toHaveBeenCalled()
	})

	it('returns room-not-found without changing the booking', async () => {
		roomFindUniqueMock.mockResolvedValue(null)

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'room-not-found' })
		expect(bookingSlotDeleteManyMock).not.toHaveBeenCalled()
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('replaces the booking and occupied slots atomically', async () => {
		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: true, booking })

		expect(bookingSlotDeleteManyMock).toHaveBeenCalledWith({
			where: { bookingId }
		})
		expect(bookingUpdateMock).toHaveBeenCalledWith({
			where: { id: bookingId },
			data: {
				title: input.title,
				roomId,
				startAt: input.startAt,
				endAt: input.endAt,
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
		expect(
			bookingSlotDeleteManyMock.mock.invocationCallOrder[0]
		).toBeLessThan(bookingUpdateMock.mock.invocationCallOrder[0]!)
	})

	it('maps a unique slot violation to slot-taken', async () => {
		transactionMock.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
				code: 'P2002',
				clientVersion: '7.9.0',
				meta: { target: ['roomId', 'startsAt'] }
			})
		)

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'slot-taken' })
	})

	it('does not hide unexpected database errors', async () => {
		transactionMock.mockRejectedValue(new Error('Database unavailable'))

		await expect(
			updateBooking(bookingId, input, userId, now)
		).rejects.toThrow('Database unavailable')
	})
})
