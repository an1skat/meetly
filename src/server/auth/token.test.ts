import { describe, expect, it } from 'vitest'
import { createSessionToken, hashSessionToken } from './token'

describe('session token', () => {
	it('creates unique base64url tokens', () => {
		const first = createSessionToken()
		const second = createSessionToken()

		expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(first).not.toBe(second)
	})

	it('creates a stable SHA-256 hash', () => {
		const token = createSessionToken()
		const firstHash = hashSessionToken(token)
		const secondHash = hashSessionToken(token)

		expect(firstHash).toBe(secondHash)
		expect(firstHash).toMatch(/^[a-f0-9]{64}$/)
	})
})
