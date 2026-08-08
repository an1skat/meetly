import { registerSchema } from '@/modules/auth/schemas'
import { logDevEmailVerificationLink } from '@/server/auth/email-verification'
import { registerUser } from '@/server/auth/register'
import { createSession } from '@/server/auth/session'
import z from 'zod'

export async function POST(request: Request) {
	const body = await request.json().catch(() => null)
	const parsed = registerSchema.safeParse(body)

	if (!parsed.success) {
		return Response.json(
			{
				message: 'Перевірте введені дані',
				fieldErrors: z.flattenError(parsed.error).fieldErrors
			},
			{ status: 400 }
		)
	}

	try {
		const result = await registerUser(parsed.data)

		if (!result.ok) {
			return Response.json(
				{
					message: 'Користувач з таким email вже існує',
					fieldErrors: {
						email: ['Користувач з таким email вже існує']
					}
				},
				{ status: 409 }
			)
		}

		await createSession(result.user.id)

		logDevEmailVerificationLink(request.url, {
			email: result.user.email,
			token: result.verificationToken
		})

		return Response.json({ user: result.user }, { status: 201 })
	} catch {
		return Response.json(
			{ message: 'Не вдалося створити обліковий запис' },
			{ status: 500 }
		)
	}
}
