import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	transactionMock,
	bookingFindUniqueMock,
	bookingUpdateMock
} = vi.hoisted(() => ({
	transactionMock: vi.fn(),
	bookingFindUniqueMock: vi.fn(),
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
const startAt = new Date('2099-07-01T06:00:00.000Z')
const previousEndAt = new Date('2099-07-01T07:00:00.000Z')
const input = {
	title: 'Оновлене планування',
	endAt: new Date('2099-07-01T07:30:00.000Z')
}
const booking = {
	id: bookingId,
	title: input.title,
	startAt,
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
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	bookingFindUniqueMock.mockResolvedValue({
		userId,
		roomId,
		startAt,
		endAt: previousEndAt
	})
	bookingUpdateMock.mockResolvedValue(booking)
	transactionMock.mockImplementation(
		(callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
			callback(transactionClient)
	)
})

describe('updateBooking', () => {
	it('returns not-found without changing the booking', async () => {
		bookingFindUniqueMock.mockResolvedValue(null)

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'not-found' })
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('forbids editing another user booking', async () => {
		bookingFindUniqueMock.mockResolvedValue({
			userId: 'another-user-id',
			roomId,
			startAt,
			endAt: previousEndAt
		})

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'forbidden' })
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('does not edit a booking that has already started', async () => {
		bookingFindUniqueMock.mockResolvedValue({
			userId,
			roomId,
			startAt: now,
			endAt: new Date(now.getTime() + 30 * 60_000)
		})

		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: false, reason: 'booking-started' })
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('does not allow shortening a booking', async () => {
		await expect(
			updateBooking(
				bookingId,
				{ ...input, endAt: new Date('2099-07-01T06:30:00.000Z') },
				userId,
				now
			)
		).resolves.toEqual({ ok: false, reason: 'cannot-shorten' })
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('validates the maximum duration against the original start', async () => {
		await expect(
			updateBooking(
				bookingId,
				{ ...input, endAt: new Date('2099-07-01T10:30:00.000Z') },
				userId,
				now
			)
		).resolves.toEqual({ ok: false, reason: 'duration' })
		expect(bookingUpdateMock).not.toHaveBeenCalled()
	})

	it('updates only the title when the duration stays unchanged', async () => {
		await expect(
			updateBooking(
				bookingId,
				{ ...input, endAt: previousEndAt },
				userId,
				now
			)
		).resolves.toEqual({ ok: true, booking })

		expect(bookingUpdateMock).toHaveBeenCalledWith({
			where: { id: bookingId },
			data: { title: input.title },
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

	it('adds only the new occupied slots when extending a booking', async () => {
		await expect(
			updateBooking(bookingId, input, userId, now)
		).resolves.toEqual({ ok: true, booking })

		expect(bookingUpdateMock).toHaveBeenCalledWith({
			where: { id: bookingId },
			data: {
				title: input.title,
				endAt: input.endAt,
				slots: {
					createMany: {
						data: [
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
