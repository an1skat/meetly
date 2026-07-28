import { getCurrentUser } from '@/server/auth/session'

export async function GET() {
	try {
		const user = await getCurrentUser()

		if (!user) {
			return Response.json({ message: 'Потрібна авторизація' }, { status: 401 })
		}

		return Response.json({ user })
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати користувача' },
			{ status: 500 }
		)
	}
}
