import { loginSchema } from '@/modules/auth/schemas'
import { loginUser } from '@/server/auth/login'
import z from 'zod'

export async function POST(request: Request) {
	const body: unknown = await request.json().catch(() => null)
	const parsed = loginSchema.safeParse(body)

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
		const result = await loginUser(parsed.data)

		if (!result.ok) {
			return Response.json(
				{ message: 'Неправильний email або пароль' },
				{ status: 401 }
			)
		}

		return Response.json({ user: result.user })
	} catch {
		return Response.json(
			{ message: 'Не вдалося виконати вхід' },
			{ status: 500 }
		)
	}
}
