import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	transactionMock,
	bookingFindUniqueMock,
	bookingSlotDeleteManyMock,
	bookingDeleteMock
} = vi.hoisted(() => ({
	transactionMock: vi.fn(),
	bookingFindUniqueMock: vi.fn(),
	bookingSlotDeleteManyMock: vi.fn(),
	bookingDeleteMock: vi.fn()
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
		delete: bookingDeleteMock
	},
	bookingSlot: {
		deleteMany: bookingSlotDeleteManyMock
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	bookingFindUniqueMock.mockResolvedValue({ userId })
	bookingSlotDeleteManyMock.mockResolvedValue({ count: 2 })
	bookingDeleteMock.mockResolvedValue({ id: bookingId })
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
		bookingFindUniqueMock.mockResolvedValue({ userId: 'another-user-id' })

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
			select: { userId: true }
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
})
