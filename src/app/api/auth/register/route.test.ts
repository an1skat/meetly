import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	createSessionMock,
	logDevEmailVerificationLinkMock,
	registerUserMock
} = vi.hoisted(() => ({
	createSessionMock: vi.fn(),
	logDevEmailVerificationLinkMock: vi.fn(),
	registerUserMock: vi.fn()
}))

vi.mock('@/server/auth/email-verification', () => ({
	logDevEmailVerificationLink: logDevEmailVerificationLinkMock
}))

vi.mock('@/server/auth/register', () => ({
	registerUser: registerUserMock
}))

vi.mock('@/server/auth/session', () => ({
	createSession: createSessionMock
}))

import { POST } from './route'

const user = {
	id: 'user-1',
	name: 'Олена',
	email: 'olena@example.com'
}

function createRequest() {
	return new Request('http://localhost:3000/api/auth/register', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			name: user.name,
			email: user.email,
			password: 'StrongPass123$'
		})
	})
}

beforeEach(() => {
	vi.resetAllMocks()
	createSessionMock.mockResolvedValue(undefined)
	registerUserMock.mockResolvedValue({
		ok: true,
		user,
		verificationToken: 'raw-verification-token'
	})
})

describe('POST /api/auth/register', () => {
	it('creates a session without exposing the verification token', async () => {
		const response = await POST(createRequest())

		expect(response.status).toBe(201)
		expect(await response.json()).toEqual({ user })
		expect(createSessionMock).toHaveBeenCalledWith(user.id)
		expect(logDevEmailVerificationLinkMock).toHaveBeenCalledWith(
			'http://localhost:3000/api/auth/register',
			{
				email: user.email,
				token: 'raw-verification-token'
			}
		)
	})
})
