import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	transactionMock,
	tokenDeleteMock,
	tokenUpsertMock,
	userFindUniqueMock,
	userUpdateMock
} = vi.hoisted(() => ({
	transactionMock: vi.fn(),
	tokenDeleteMock: vi.fn(),
	tokenUpsertMock: vi.fn(),
	userFindUniqueMock: vi.fn(),
	userUpdateMock: vi.fn()
}))

vi.mock('@/server/db/prisma', () => ({
	prisma: {
		$transaction: transactionMock,
		emailVerificationToken: {
			upsert: tokenUpsertMock
		},
		user: {
			findUnique: userFindUniqueMock
		}
	}
}))

import { Prisma } from '@/generated/prisma/client'
import {
	createAuthUrl,
	createEmailVerificationTokenData,
	logDevEmailVerificationLink,
	regenerateEmailVerificationToken,
	verifyEmailToken
} from './email-verification'
import { hashOpaqueToken } from './token'

const now = new Date('2026-08-08T12:00:00.000Z')
const user = {
	id: 'user-1',
	email: 'olena@example.com',
	emailVerifiedAt: null
}

const transactionClient = {
	emailVerificationToken: {
		delete: tokenDeleteMock
	},
	user: {
		update: userUpdateMock
	}
}

beforeEach(() => {
	vi.resetAllMocks()

	transactionMock.mockImplementation(
		(callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
			callback(transactionClient)
	)
	tokenUpsertMock.mockResolvedValue(undefined)
	userUpdateMock.mockResolvedValue(undefined)
})

afterEach(() => {
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

describe('email verification', () => {
	it('uses localhost for development links created from the bind address', () => {
		vi.stubEnv('NODE_ENV', 'development')

		expect(
			createAuthUrl(
				'/verify-email/result',
				'http://0.0.0.0:3000/api/auth/verify-email'
			).toString()
		).toBe('http://localhost:3000/verify-email/result')
	})

	it('logs a highlighted localhost link in development', () => {
		vi.stubEnv('NODE_ENV', 'development')
		const infoMock = vi.spyOn(console, 'info').mockImplementation(() => {})

		logDevEmailVerificationLink('http://0.0.0.0:3000/api/auth/register', {
			email: user.email,
			token: 'visible-token'
		})

		expect(infoMock).toHaveBeenCalledOnce()
		const message = String(infoMock.mock.calls[0][0])

		expect(message).toContain('\x1b[1;36m━━━ EMAIL VERIFICATION ━━━')
		expect(message).toContain(
			'http://localhost:3000/api/auth/verify-email?token=visible-token'
		)
		expect(message).not.toContain('0.0.0.0')
	})

	it('does not log a verification link in production', () => {
		vi.stubEnv('NODE_ENV', 'production')
		const infoMock = vi.spyOn(console, 'info').mockImplementation(() => {})

		logDevEmailVerificationLink('https://meetly.example/api/auth/register', {
			email: user.email,
			token: 'secret-token'
		})

		expect(infoMock).not.toHaveBeenCalled()
	})

	it('creates a hashed token with a one-hour lifetime', () => {
		const verification = createEmailVerificationTokenData(now)

		expect(verification.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(verification.tokenHash).toBe(
			hashOpaqueToken(verification.token)
		)
		expect(verification.tokenHash).not.toBe(verification.token)
		expect(verification.expiresAt).toEqual(
			new Date('2026-08-08T13:00:00.000Z')
		)
	})

	it('replaces the current token without storing its raw value', async () => {
		userFindUniqueMock.mockResolvedValue(user)

		const result = await regenerateEmailVerificationToken(user.email, now)

		if (!result) {
			throw new Error('Token was not regenerated')
		}

		expect(tokenUpsertMock).toHaveBeenCalledWith({
			where: {
				userId: user.id
			},
			update: {
				tokenHash: hashOpaqueToken(result.token),
				expiresAt: new Date('2026-08-08T13:00:00.000Z')
			},
			create: {
				userId: user.id,
				tokenHash: hashOpaqueToken(result.token),
				expiresAt: new Date('2026-08-08T13:00:00.000Z')
			}
		})
		expect(result).toEqual({
			email: user.email,
			token: result.token
		})
	})

	it.each([
		['missing user', null],
		[
			'verified user',
			{
				...user,
				emailVerifiedAt: now
			}
		]
	])('does not regenerate a token for a %s', async (_name, storedUser) => {
		userFindUniqueMock.mockResolvedValue(storedUser)

		await expect(
			regenerateEmailVerificationToken(user.email, now)
		).resolves.toBeNull()
		expect(tokenUpsertMock).not.toHaveBeenCalled()
	})

	it('consumes a valid token and verifies the user', async () => {
		const token = 'valid-token'

		tokenDeleteMock.mockResolvedValue({
			userId: user.id,
			expiresAt: new Date('2026-08-08T13:00:00.000Z'),
			user: {
				email: user.email
			}
		})

		await expect(verifyEmailToken(token, now)).resolves.toEqual({ ok: true })
		expect(tokenDeleteMock).toHaveBeenCalledWith({
			where: {
				tokenHash: hashOpaqueToken(token)
			},
			select: {
				userId: true,
				expiresAt: true,
				user: {
					select: {
						email: true
					}
				}
			}
		})
		expect(userUpdateMock).toHaveBeenCalledWith({
			where: {
				id: user.id
			},
			data: {
				emailVerifiedAt: now
			}
		})
	})

	it('consumes an expired token without verifying the user', async () => {
		tokenDeleteMock.mockResolvedValue({
			userId: user.id,
			expiresAt: now,
			user: {
				email: user.email
			}
		})

		await expect(verifyEmailToken('expired-token', now)).resolves.toEqual({
			ok: false,
			reason: 'expired',
			email: user.email
		})
		expect(userUpdateMock).not.toHaveBeenCalled()
	})

	it('treats a missing or already consumed token as invalid', async () => {
		tokenDeleteMock.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('Record not found', {
				code: 'P2025',
				clientVersion: '7.9.0'
			})
		)

		await expect(verifyEmailToken('used-token', now)).resolves.toEqual({
			ok: false,
			reason: 'invalid'
		})
		expect(userUpdateMock).not.toHaveBeenCalled()
	})

	it('does not hide unexpected database errors', async () => {
		tokenDeleteMock.mockRejectedValue(new Error('Database unavailable'))

		await expect(verifyEmailToken('valid-token', now)).rejects.toThrow(
			'Database unavailable'
		)
	})
})
