import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/server/db/prisma'
import { createOpaqueToken, hashOpaqueToken } from './token'

const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000

export function createEmailVerificationTokenData(now = new Date()) {
	const token = createOpaqueToken()

	return {
		token,
		tokenHash: hashOpaqueToken(token),
		expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS)
	}
}

export function logDevEmailVerificationLink(
	requestUrl: string,
	verification: {
		email: string
		token: string
	}
) {
	if (process.env.NODE_ENV === 'production') {
		return
	}

	const verificationUrl = new URL('/api/auth/verify-email', requestUrl)

	verificationUrl.searchParams.set('token', verification.token)

	console.info(
		`[dev] Email verification for ${verification.email}: ${verificationUrl.toString()}`
	)
}

export async function regenerateEmailVerificationToken(
	email: string,
	now = new Date()
) {
	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			email: true,
			emailVerifiedAt: true
		}
	})

	if (!user || user.emailVerifiedAt) {
		return null
	}

	const verification = createEmailVerificationTokenData(now)

	await prisma.emailVerificationToken.upsert({
		where: {
			userId: user.id
		},
		update: {
			tokenHash: verification.tokenHash,
			expiresAt: verification.expiresAt
		},
		create: {
			userId: user.id,
			tokenHash: verification.tokenHash,
			expiresAt: verification.expiresAt
		}
	})

	return {
		email: user.email,
		token: verification.token
	}
}

export async function verifyEmailToken(token: string, now = new Date()) {
	const tokenHash = hashOpaqueToken(token)

	try {
		return await prisma.$transaction(async transaction => {
			const verification = await transaction.emailVerificationToken.delete({
				where: {
					tokenHash
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

			if (verification.expiresAt <= now) {
				return {
					ok: false,
					reason: 'expired',
					email: verification.user.email
				} as const
			}

			await transaction.user.update({
				where: {
					id: verification.userId
				},
				data: {
					emailVerifiedAt: now
				}
			})

			return {
				ok: true
			} as const
		})
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2025'
		) {
			return {
				ok: false,
				reason: 'invalid'
			} as const
		}

		throw error
	}
}
