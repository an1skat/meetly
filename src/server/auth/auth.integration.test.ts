import { randomUUID } from 'node:crypto'
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it
} from 'vitest'
import { hashOpaqueToken } from './token'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
	console.warn(
		'\x1b[33m⚠ TEST_DATABASE_URL is not set — auth integration tests will be skipped\x1b[0m'
	)
}

const describeDatabase = testDatabaseUrl
	? describe
	: describe.skip

let prisma:
	| (typeof import('@/server/db/prisma'))['prisma']
	| undefined

let registerUser:
	| (typeof import('./register'))['registerUser']
	| undefined

let authenticateUser:
	| (typeof import('./login'))['authenticateUser']
	| undefined

let verifyEmailToken:
	| (typeof import('./email-verification'))['verifyEmailToken']
	| undefined

const marker = randomUUID()
const email = `auth-${marker}@example.com`

describeDatabase('authentication integration', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = testDatabaseUrl!

		;({ prisma } = await import('@/server/db/prisma'))
		;({ registerUser } = await import('./register'))
		;({ authenticateUser } = await import('./login'))
		;({ verifyEmailToken } = await import('./email-verification'))
	})

	afterAll(async () => {
		if (!prisma) {
			return
		}

		await prisma.user.deleteMany({
			where: { email }
		})

		await prisma.$disconnect()
	})

	it('registers and verifies a user in PostgreSQL', async () => {
		if (!prisma || !registerUser || !verifyEmailToken) {
			throw new Error('Integration test was not initialized')
		}

		const result = await registerUser({
			name: 'Тестовий користувач',
			email,
			password: 'StrongPass123$'
		})

		expect(result.ok).toBe(true)

		if (!result.ok) {
			throw new Error('Registration failed')
		}

		const storedUser = await prisma.user.findUnique({
			where: { email }
		})
		const storedToken =
			await prisma.emailVerificationToken.findUnique({
				where: {
					userId: result.user.id
				}
			})

		expect(storedUser).not.toBeNull()
		expect(storedUser?.name).toBe('Тестовий користувач')
		expect(storedUser?.emailVerifiedAt).toBeNull()
		expect(storedUser?.passwordHash).not.toBe(
			'StrongPass123$'
		)
		expect(storedToken?.tokenHash).toBe(
			hashOpaqueToken(result.verificationToken)
		)
		expect(storedToken?.tokenHash).not.toBe(
			result.verificationToken
		)

		await expect(
			verifyEmailToken(result.verificationToken)
		).resolves.toEqual({ ok: true })
		await expect(
			verifyEmailToken(result.verificationToken)
		).resolves.toEqual({
			ok: false,
			reason: 'invalid'
		})

		const verifiedUser = await prisma.user.findUnique({
			where: { email }
		})
		const consumedToken =
			await prisma.emailVerificationToken.findUnique({
				where: {
					userId: result.user.id
				}
			})

		expect(verifiedUser?.emailVerifiedAt).toBeInstanceOf(Date)
		expect(consumedToken).toBeNull()
	})

	it('authenticates a registered user', async () => {
		if (!authenticateUser) {
			throw new Error('Integration test was not initialized')
		}

		await expect(
			authenticateUser({
				email,
				password: 'StrongPass123$'
			})
		).resolves.toMatchObject({
			name: 'Тестовий користувач',
			email
		})
	})

	it('rejects a wrong password', async () => {
		if (!authenticateUser) {
			throw new Error('Integration test was not initialized')
		}

		await expect(
			authenticateUser({
				email,
				password: 'WrongPass123$'
			})
		).resolves.toBeNull()
	})
})
