import type { LoginInput } from '@/modules/auth/schemas'
import { prisma } from '@/server/db/prisma'
import { verifyPassword } from './password'
import { createSession } from './session'

const DUMMY_PASSWORD_HASH =
	'$2b$12$RifiWlmwJuPvLDkKws2H5uOUto/UY6.FHb4O65yIfkMc.qs50yhKK'

export async function authenticateUser({
	email,
	password
}: LoginInput) {
	const user = await prisma.user.findUnique({
		where: {
			email
		},
		select: {
			id: true,
			name: true,
			email: true,
			passwordHash: true
		}
	})

	const passwordHash =
		user?.passwordHash ?? DUMMY_PASSWORD_HASH

	const passwordIsValid = await verifyPassword(
		password,
		passwordHash
	)

	if (!user || !passwordIsValid) {
		return null
	}

	return {
		id: user.id,
		name: user.name,
		email: user.email
	}
}

export async function loginUser(input: LoginInput) {
	const user = await authenticateUser(input)

	if (!user) {
		return {
			ok: false as const
		}
	}

	await createSession(user.id)

	return {
		ok: true as const,
		user
	}
}
