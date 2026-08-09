import { afterEach, describe, expect, it, vi } from 'vitest'

const { getRoomsMock, getRoomByIdMock } = vi.hoisted(() => ({
	getRoomsMock: vi.fn(),
	getRoomByIdMock: vi.fn()
}))

vi.mock('@/server/rooms/read', () => ({
	getRooms: getRoomsMock,
	getRoomById: getRoomByIdMock
}))

import { GET as getRoomHandler } from './[id]/route'
import { GET as getRoomsHandler } from './route'

const room = {
	id: 'clh4k3j2l0000qwer1234asdf',
	name: 'Акваріум',
	floor: 1,
	capacity: 4
}

afterEach(() => {
	vi.clearAllMocks()
})

describe('GET /api/rooms', () => {
	it('returns all rooms', async () => {
		getRoomsMock.mockResolvedValue([room])

		const response = await getRoomsHandler(
			new Request('http://localhost/api/rooms')
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ rooms: [room] })
		expect(getRoomsMock).toHaveBeenCalledWith(undefined)
	})

	it('returns 500 when the database query fails', async () => {
		getRoomsMock.mockRejectedValue(new Error('Database unavailable'))

		const response = await getRoomsHandler(
			new Request('http://localhost/api/rooms')
		)

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({
			message: 'Не вдалося отримати кімнати'
		})
	})

	it('filters rooms by minimum capacity', async () => {
		getRoomsMock.mockResolvedValue([room])

		const response = await getRoomsHandler(
			new Request('http://localhost/api/rooms?minCapacity=6')
		)

		expect(response.status).toBe(200)
		expect(getRoomsMock).toHaveBeenCalledWith(6)
	})

	it.each(['abc', '0', '-1', '6.5'])(
		'returns 400 for invalid minCapacity %s',
		async minCapacity => {
			const response = await getRoomsHandler(
				new Request(
					`http://localhost/api/rooms?minCapacity=${minCapacity}`
				)
			)

			expect(response.status).toBe(400)
			expect(getRoomsMock).not.toHaveBeenCalled()
		}
	)
})

describe('GET /api/rooms/:id', () => {
	it('returns a room by id', async () => {
		getRoomByIdMock.mockResolvedValue(room)

		const response = await getRoomHandler(new Request('http://localhost'), {
			params: Promise.resolve({ id: room.id })
		})

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ room })
		expect(getRoomByIdMock).toHaveBeenCalledWith(room.id)
	})

	it('returns 404 when the room does not exist', async () => {
		getRoomByIdMock.mockResolvedValue(null)

		const response = await getRoomHandler(new Request('http://localhost'), {
			params: Promise.resolve({ id: room.id })
		})

		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			message: 'Кімнату не знайдено'
		})
	})

	it('returns 400 for an invalid room id', async () => {
		const response = await getRoomHandler(new Request('http://localhost'), {
			params: Promise.resolve({ id: 'invalid-id' })
		})

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			message: 'Некоректний ідентифікатор кімнати'
		})
		expect(getRoomByIdMock).not.toHaveBeenCalled()
	})
})
