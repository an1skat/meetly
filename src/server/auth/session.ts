import { prisma } from '@/server/db/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, hashSessionToken } from './token'

const SESSION_COOKIE_NAME = 'meetly_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(userId: string) {
	const token = createSessionToken()
	const tokenHash = hashSessionToken(token)
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

	await prisma.session.create({
		data: {
			userId,
			tokenHash,
			expiresAt
		}
	})

	const cookieStore = await cookies()

	cookieStore.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		expires: expiresAt
	})
}

export async function deleteCurrentSession() {
	const cookieStore = await cookies()
	const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

	if (token) {
		await prisma.session.deleteMany({
			where: {
				tokenHash: hashSessionToken(token)
			}
		})
	}

	cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getCurrentUser() {
	const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value

	if (!token) {
		return null
	}

	const session = await prisma.session.findFirst({
		where: {
			tokenHash: hashSessionToken(token),
			expiresAt: {
				gt: new Date()
			}
		},
		select: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					emailVerifiedAt: true
				}
			}
		}
	})

	return session?.user ?? null
}

export async function requireUser() {
	const user = await getCurrentUser()

	if (!user) {
		redirect('/login')
	}

	return user
}
