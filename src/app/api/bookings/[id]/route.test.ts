import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserMock, cancelBookingMock, updateBookingMock } = vi.hoisted(
	() => ({
		getCurrentUserMock: vi.fn(),
		cancelBookingMock: vi.fn(),
		updateBookingMock: vi.fn()
	})
)

vi.mock('@/server/auth/session', () => ({
	getCurrentUser: getCurrentUserMock
}))

vi.mock('@/server/bookings/cancel', () => ({
	cancelBooking: cancelBookingMock
}))

vi.mock('@/server/bookings/update', () => ({
	updateBooking: updateBookingMock
}))

import { DELETE, PATCH } from './route'

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
const updateBody = {
	title: 'Оновлене планування',
	endAt: '2099-07-01T07:00:00.000Z'
}

function createPatchRequest(body: unknown = updateBody) {
	return new Request(`http://localhost/api/bookings/${bookingId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	})
}

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
		expect(cancelBookingMock).toHaveBeenCalledWith(
			bookingId,
			user.id,
			'occurrence'
		)
	})

	it('cancels an owned booking', async () => {
		cancelBookingMock.mockResolvedValue({ ok: true })

		const response = await DELETE(request, context)

		expect(response.status).toBe(204)
		expect(await response.text()).toBe('')
		expect(cancelBookingMock).toHaveBeenCalledWith(
			bookingId,
			user.id,
			'occurrence'
		)
	})

	it('cancels the future series when requested', async () => {
		cancelBookingMock.mockResolvedValue({ ok: true })
		const seriesRequest = new Request(
			`http://localhost/api/bookings/${bookingId}?scope=series`,
			{ method: 'DELETE' }
		)

		const response = await DELETE(seriesRequest, context)

		expect(response.status).toBe(204)
		expect(cancelBookingMock).toHaveBeenCalledWith(
			bookingId,
			user.id,
			'series'
		)
	})

	it('returns 400 for an invalid cancellation scope', async () => {
		const invalidRequest = new Request(
			`http://localhost/api/bookings/${bookingId}?scope=unknown`,
			{ method: 'DELETE' }
		)

		const response = await DELETE(invalidRequest, context)

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			message: 'Некоректний тип скасування'
		})
		expect(cancelBookingMock).not.toHaveBeenCalled()
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

describe('PATCH /api/bookings/:id', () => {
	it('returns 401 for an anonymous request', async () => {
		getCurrentUserMock.mockResolvedValue(null)

		const response = await PATCH(createPatchRequest(), context)

		expect(response.status).toBe(401)
		expect(updateBookingMock).not.toHaveBeenCalled()
	})

	it('validates the request body', async () => {
		const response = await PATCH(
			createPatchRequest({ ...updateBody, title: '' }),
			context
		)

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({
			message: 'Перевірте введені дані',
			fieldErrors: {
				title: ['Вкажіть назву бронювання']
			}
		})
		expect(updateBookingMock).not.toHaveBeenCalled()
	})

	it('forbids editing another user booking through the API', async () => {
		updateBookingMock.mockResolvedValue({ ok: false, reason: 'forbidden' })

		const response = await PATCH(createPatchRequest(), context)

		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({
			message: 'Ви можете редагувати лише власне бронювання',
			fieldErrors: {}
		})
		expect(updateBookingMock).toHaveBeenCalledWith(
			bookingId,
			{
				...updateBody,
				endAt: new Date(updateBody.endAt)
			},
			user.id
		)
	})

	it('explains that a booking cannot be shortened', async () => {
		updateBookingMock.mockResolvedValue({
			ok: false,
			reason: 'cannot-shorten'
		})

		const response = await PATCH(createPatchRequest(), context)

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			message: 'Бронювання можна лише продовжити',
			fieldErrors: {
				endAt: ['Оберіть поточну або більшу тривалість']
			}
		})
	})

	it('updates an owned booking', async () => {
		const updatedBooking = { id: bookingId, title: updateBody.title }
		updateBookingMock.mockResolvedValue({
			ok: true,
			booking: updatedBooking
		})

		const response = await PATCH(createPatchRequest(), context)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ booking: updatedBooking })
	})

	it('returns 500 without exposing an internal error', async () => {
		updateBookingMock.mockRejectedValue(
			new Error('Database credentials leaked here')
		)

		const response = await PATCH(createPatchRequest(), context)

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({
			message: 'Не вдалося оновити бронювання'
		})
	})
})
