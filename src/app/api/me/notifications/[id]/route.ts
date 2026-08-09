import { getCurrentUser } from '@/server/auth/session'
import { markNotificationRead } from '@/server/notifications/read'

export async function PATCH(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await getCurrentUser()

		if (!user) {
			return Response.json(
				{ message: 'Потрібно увійти в обліковий запис' },
				{ status: 401 }
			)
		}

		const { id } = await params
		const updated = await markNotificationRead(id, user.id)

		if (!updated) {
			return Response.json(
				{ message: 'Сповіщення не знайдено' },
				{ status: 404 }
			)
		}

		return new Response(null, { status: 204 })
	} catch {
		return Response.json(
			{ message: 'Не вдалося оновити сповіщення' },
			{ status: 500 }
		)
	}
}
