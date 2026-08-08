import { resendVerificationSchema } from '@/modules/auth/schemas'
import {
	logDevEmailVerificationLink,
	regenerateEmailVerificationToken
} from '@/server/auth/email-verification'
import z from 'zod'

export async function POST(request: Request) {
	const body = await request.json().catch(() => null)
	const parsed = resendVerificationSchema.safeParse(body)

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
		const verification = await regenerateEmailVerificationToken(
			parsed.data.email
		)

		if (verification) {
			logDevEmailVerificationLink(request.url, verification)
		}

		return new Response(null, { status: 204 })
	} catch {
		return Response.json(
			{
				message: 'Не вдалося створити нове посилання'
			},
			{ status: 500 }
		)
	}
}
