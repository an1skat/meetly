import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserMock, getRoomBookingsMock } = vi.hoisted(() => ({
	getCurrentUserMock: vi.fn(),
	getRoomBookingsMock: vi.fn()
}))

vi.mock('@/server/auth/session', () => ({
	getCurrentUser: getCurrentUserMock
}))

vi.mock('@/server/bookings/read', () => ({
	getRoomBookings: getRoomBookingsMock
}))

import { GET } from './route'

const roomId = 'clh4k3j2l0000qwer1234asdf'
const user = {
	id: 'clh4k3j2l0001qwer1234asdf',
	name: 'Андрій',
	email: 'andriy@example.com'
}
const from = '2026-08-03T00:00:00.000Z'
const to = '2026-08-10T00:00:00.000Z'

function createRequest(query = `from=${from}&to=${to}`) {
	return new Request(`http://localhost/api/rooms/${roomId}/bookings?${query}`)
}

beforeEach(() => {
	vi.resetAllMocks()
	getCurrentUserMock.mockResolvedValue(user)
})

describe('GET /api/rooms/:roomId/bookings', () => {
	it('returns bookings for the requested room and range', async () => {
		const bookings = [{ id: 'cm1booking000000000000001' }]

		getRoomBookingsMock.mockResolvedValue(bookings)

		const response = await GET(createRequest(), {
			params: Promise.resolve({ id: roomId })
		})

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ bookings })
		expect(getRoomBookingsMock).toHaveBeenCalledWith(
			roomId,
			new Date(from),
			new Date(to),
			user.id
		)
	})

	it('returns 401 for an anonymous request', async () => {
		getCurrentUserMock.mockResolvedValue(null)

		const response = await GET(createRequest(), {
			params: Promise.resolve({ id: roomId })
		})

		expect(response.status).toBe(401)
		expect(getRoomBookingsMock).not.toHaveBeenCalled()
	})

	it('returns 400 for an invalid range', async () => {
		const response = await GET(createRequest(`from=${to}&to=${from}`), {
			params: Promise.resolve({ id: roomId })
		})

		expect(response.status).toBe(400)
		expect(getRoomBookingsMock).not.toHaveBeenCalled()
	})
})
