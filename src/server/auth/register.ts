import { Prisma } from '@/generated/prisma/client'
import type { RegisterInput } from '@/modules/auth/schemas'
import { prisma } from '@/server/db/prisma'
import { createEmailVerificationTokenData } from './email-verification'
import { hashPassword } from './password'

export async function registerUser({ name, email, password }: RegisterInput) {
	const passwordHash = await hashPassword(password)
	const verification = createEmailVerificationTokenData()

	try {
		const user = await prisma.user.create({
			data: {
				name,
				email,
				passwordHash,
				emailVerificationToken: {
					create: {
						tokenHash: verification.tokenHash,
						expiresAt: verification.expiresAt
					}
				}
			},
			select: {
				id: true,
				name: true,
				email: true
			}
		})

		return {
			ok: true as const,
			user,
			verificationToken: verification.token
		}
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			return {
				ok: false as const,
				reason: 'EMAIL_ALREADY_EXISTS' as const
			}
		}

		throw error
	}
}
