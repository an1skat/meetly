import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	transactionMock,
	bookingFindUniqueMock,
	bookingFindManyMock,
	bookingSlotDeleteManyMock,
	bookingDeleteMock,
	bookingDeleteManyMock
} = vi.hoisted(() => ({
	transactionMock: vi.fn(),
	bookingFindUniqueMock: vi.fn(),
	bookingFindManyMock: vi.fn(),
	bookingSlotDeleteManyMock: vi.fn(),
	bookingDeleteMock: vi.fn(),
	bookingDeleteManyMock: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		$transaction: transactionMock
	}
}))

import { cancelBooking } from './cancel'

const bookingId = 'clh4k3j2l0002qwer1234asdf'
const userId = 'clh4k3j2l0001qwer1234asdf'

const transactionClient = {
	booking: {
		findUnique: bookingFindUniqueMock,
		findMany: bookingFindManyMock,
		delete: bookingDeleteMock,
		deleteMany: bookingDeleteManyMock
	},
	bookingSlot: {
		deleteMany: bookingSlotDeleteManyMock
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	bookingFindUniqueMock.mockResolvedValue({
		userId,
		startAt: new Date('2099-01-01T00:00:00.000Z'),
		recurringSeriesId: null
	})
	bookingFindManyMock.mockResolvedValue([])
	bookingSlotDeleteManyMock.mockResolvedValue({ count: 2 })
	bookingDeleteMock.mockResolvedValue({ id: bookingId })
	bookingDeleteManyMock.mockResolvedValue({ count: 0 })
	transactionMock.mockImplementation(
		(callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
			callback(transactionClient)
	)
})

describe('cancelBooking', () => {
	it('returns not-found without deleting anything', async () => {
		bookingFindUniqueMock.mockResolvedValue(null)

		await expect(cancelBooking(bookingId, userId)).resolves.toEqual({
			ok: false,
			reason: 'not-found'
		})
		expect(bookingSlotDeleteManyMock).not.toHaveBeenCalled()
		expect(bookingDeleteMock).not.toHaveBeenCalled()
	})

	it('forbids deleting another user booking', async () => {
		bookingFindUniqueMock.mockResolvedValue({
			userId: 'another-user-id',
			startAt: new Date('2099-01-01T00:00:00.000Z'),
			recurringSeriesId: null
		})

		await expect(cancelBooking(bookingId, userId)).resolves.toEqual({
			ok: false,
			reason: 'forbidden'
		})
		expect(bookingSlotDeleteManyMock).not.toHaveBeenCalled()
		expect(bookingDeleteMock).not.toHaveBeenCalled()
	})

	it('deletes owned booking slots and booking in one transaction', async () => {
		await expect(cancelBooking(bookingId, userId)).resolves.toEqual({ ok: true })

		expect(bookingFindUniqueMock).toHaveBeenCalledWith({
			where: { id: bookingId },
			select: {
				userId: true,
				startAt: true,
				recurringSeriesId: true
			}
		})
		expect(bookingSlotDeleteManyMock).toHaveBeenCalledWith({
			where: { bookingId }
		})
		expect(bookingDeleteMock).toHaveBeenCalledWith({
			where: { id: bookingId }
		})
		expect(
			bookingSlotDeleteManyMock.mock.invocationCallOrder[0]
		).toBeLessThan(bookingDeleteMock.mock.invocationCallOrder[0]!)
	})

	it('deletes only future bookings when cancelling a series', async () => {
		const seriesId = 'clh4k3j2l0003qwer1234asdf'
		const now = new Date('2098-12-31T00:00:00.000Z')

		bookingFindUniqueMock.mockResolvedValue({
			userId,
			startAt: new Date('2099-01-01T00:00:00.000Z'),
			recurringSeriesId: seriesId
		})
		bookingFindManyMock.mockResolvedValue([
			{ id: bookingId },
			{ id: 'clh4k3j2l0004qwer1234asdf' }
		])
		bookingDeleteManyMock.mockResolvedValue({ count: 2 })

		await expect(
			cancelBooking(bookingId, userId, 'series', now)
		).resolves.toEqual({ ok: true })

		expect(bookingFindManyMock).toHaveBeenCalledWith({
			where: {
				recurringSeriesId: seriesId,
				userId,
				startAt: {
					gt: now
				}
			},
			select: {
				id: true
			}
		})
		expect(bookingSlotDeleteManyMock).toHaveBeenCalledWith({
			where: {
				bookingId: {
					in: [bookingId, 'clh4k3j2l0004qwer1234asdf']
				}
			}
		})
		expect(bookingDeleteManyMock).toHaveBeenCalledWith({
			where: {
				id: {
					in: [bookingId, 'clh4k3j2l0004qwer1234asdf']
				}
			}
		})
		expect(bookingDeleteMock).not.toHaveBeenCalled()
	})
})
