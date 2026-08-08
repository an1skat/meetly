import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserMock, createBookingMock } = vi.hoisted(() => ({
	getCurrentUserMock: vi.fn(),
	createBookingMock: vi.fn()
}))

vi.mock('@/server/auth/session', () => ({
	getCurrentUser: getCurrentUserMock
}))

vi.mock('@/server/bookings/create', () => ({
	createBooking: createBookingMock
}))

import { POST } from './route'

const roomId = 'clh4k3j2l0000qwer1234asdf'
const user = {
	id: 'clh4k3j2l0001qwer1234asdf',
	name: 'Андрій',
	email: 'andriy@example.com',
	emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z')
}

const validBody = {
	roomId,
	title: 'Планування',
	startAt: '2099-07-01T06:00:00.000Z',
	endAt: '2099-07-01T07:00:00.000Z'
}

function createRequest(body: unknown) {
	return new Request('http://localhost/api/bookings', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	})
}

beforeEach(() => {
	vi.resetAllMocks()
	getCurrentUserMock.mockResolvedValue(user)
})

describe('POST /api/bookings', () => {
	it('returns 401 for an anonymous request', async () => {
		getCurrentUserMock.mockResolvedValue(null)

		const response = await POST(createRequest(validBody))

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({
			message: 'Потрібно увійти в обліковий запис'
		})
		expect(createBookingMock).not.toHaveBeenCalled()
	})

	it('returns field errors for an invalid request', async () => {
		const response = await POST(
			createRequest({
				...validBody,
				title: '   '
			})
		)

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			message: 'Перевірте введені дані',
			fieldErrors: {
				title: ['Вкажіть назву бронювання']
			}
		})
		expect(createBookingMock).not.toHaveBeenCalled()
	})

	it.each([
		[
			'email-not-verified',
			403,
			'Підтвердьте email перед створенням бронювання'
		],
		['order', 400, 'Час початку має бути раніше за час завершення'],
		['slot', 400, 'Час має відповідати 30-хвилинній сітці'],
		[
			'duration',
			400,
			'Тривалість бронювання має становити від 30 хвилин до 4 годин'
		],
		[
			'office-hours',
			400,
			'Бронювання має бути в межах 09:00–19:00 за київським часом'
		],
		['past', 400, 'Бронювання можна створити лише на майбутній час'],
		['room-not-found', 404, 'Кімнату не знайдено'],
		['slot-taken', 409, 'Цей слот уже зайнятий']
	] as const)(
		'maps %s to a readable response',
		async (reason, status, message) => {
			createBookingMock.mockResolvedValue({
				ok: false,
				reason
			})

			const response = await POST(createRequest(validBody))
			const body = await response.json()

			expect(response.status).toBe(status)
			expect(body.message).toBe(message)
			expect(body.fieldErrors).toBeDefined()
		}
	)

	it('creates a booking for the authenticated user', async () => {
		const booking = {
			id: 'clh4k3j2l0002qwer1234asdf',
			title: validBody.title,
			startAt: new Date(validBody.startAt),
			endAt: new Date(validBody.endAt),
			roomId,
			user: {
				id: user.id,
				name: user.name
			}
		}

		createBookingMock.mockResolvedValue({
			ok: true,
			booking
		})

		const response = await POST(createRequest(validBody))

		expect(response.status).toBe(201)
		expect(await response.json()).toEqual({
			booking: {
				...booking,
				startAt: validBody.startAt,
				endAt: validBody.endAt
			}
		})

		expect(createBookingMock).toHaveBeenCalledWith(
			{
				...validBody,
				startAt: new Date(validBody.startAt),
				endAt: new Date(validBody.endAt)
			},
			user
		)
	})

	it('returns 500 without exposing an internal error', async () => {
		createBookingMock.mockRejectedValue(
			new Error('Database credentials leaked here')
		)

		const response = await POST(createRequest(validBody))

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({
			message: 'Не вдалося створити бронювання'
		})
	})
})
