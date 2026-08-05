import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserMock, cancelBookingMock } = vi.hoisted(() => ({
	getCurrentUserMock: vi.fn(),
	cancelBookingMock: vi.fn()
}))

vi.mock('@/server/auth/session', () => ({
	getCurrentUser: getCurrentUserMock
}))

vi.mock('@/server/bookings/cancel', () => ({
	cancelBooking: cancelBookingMock
}))

import { DELETE } from './route'

const bookingId = 'clh4k3j2l0002qwer1234asdf'
const user = {
	id: 'clh4k3j2l0001qwer1234asdf',
	name: 'Андрій',
	email: 'andriy@example.com'
}

const request = new Request(`http://localhost/api/bookings/${bookingId}`, {
	method: 'DELETE'
})
const context = { params: Promise.resolve({ id: bookingId }) }

beforeEach(() => {
	vi.resetAllMocks()
	getCurrentUserMock.mockResolvedValue(user)
})

describe('DELETE /api/bookings/:id', () => {
	it('returns 401 for an anonymous request', async () => {
		getCurrentUserMock.mockResolvedValue(null)

		const response = await DELETE(request, context)

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({
			message: 'Потрібно увійти в обліковий запис'
		})
		expect(cancelBookingMock).not.toHaveBeenCalled()
	})

	it('returns 404 when the booking does not exist', async () => {
		cancelBookingMock.mockResolvedValue({ ok: false, reason: 'not-found' })

		const response = await DELETE(request, context)

		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			message: 'Бронювання не знайдено'
		})
	})

	it('forbids cancelling another user booking through the API', async () => {
		cancelBookingMock.mockResolvedValue({ ok: false, reason: 'forbidden' })

		const response = await DELETE(request, context)

		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({
			message: 'Ви можете скасувати лише власне бронювання'
		})
		expect(cancelBookingMock).toHaveBeenCalledWith(bookingId, user.id)
	})

	it('cancels an owned booking', async () => {
		cancelBookingMock.mockResolvedValue({ ok: true })

		const response = await DELETE(request, context)

		expect(response.status).toBe(204)
		expect(await response.text()).toBe('')
		expect(cancelBookingMock).toHaveBeenCalledWith(bookingId, user.id)
	})

	it('returns 500 without exposing an internal error', async () => {
		cancelBookingMock.mockRejectedValue(
			new Error('Database credentials leaked here')
		)

		const response = await DELETE(request, context)

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({
			message: 'Не вдалося скасувати бронювання'
		})
	})
})
