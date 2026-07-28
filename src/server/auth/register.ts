import { Prisma } from '@/generated/prisma/client'
import type { RegisterInput } from '@/modules/auth/schemas'
import { prisma } from '@/server/db/prisma'
import { hashPassword } from './password'

export async function registerUser({ name, email, password }: RegisterInput) {
	try {
		const user = await prisma.user.create({
			data: {
				name,
				email,
				passwordHash: await hashPassword(password)
			},
			select: {
				id: true,
				name: true,
				email: true
			}
		})

		return {
			ok: true as const,
			user
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
