import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyEmailTokenMock } = vi.hoisted(() => ({
	verifyEmailTokenMock: vi.fn()
}))

vi.mock('@/server/auth/email-verification', () => {
	return {
		createAuthUrl: (pathname: string, requestUrl: string) => {
			const url = new URL(pathname, requestUrl)

			if (url.hostname === '0.0.0.0') {
				url.hostname = 'localhost'
			}

			return url
		},
		verifyEmailToken: verifyEmailTokenMock
	}
})

import { GET } from './route'

beforeEach(() => {
	vi.resetAllMocks()
	vi.stubEnv('NODE_ENV', 'development')
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('GET /api/auth/verify-email', () => {
	it('redirects a valid token through localhost', async () => {
		verifyEmailTokenMock.mockResolvedValue({ ok: true })

		const response = await GET(
			new Request(
				'http://0.0.0.0:3000/api/auth/verify-email?token=valid-token'
			)
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe(
			'http://localhost:3000/verify-email/result?status=success'
		)
	})

	it('redirects a missing token through localhost', async () => {
		const response = await GET(
			new Request('http://0.0.0.0:3000/api/auth/verify-email')
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe(
			'http://localhost:3000/verify-email/result?status=invalid'
		)
		expect(verifyEmailTokenMock).not.toHaveBeenCalled()
	})
})
