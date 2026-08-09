import { getCurrentUser } from '@/server/auth/session'
import { getUnreadNotifications } from '@/server/notifications/read'

export async function GET() {
	try {
		const user = await getCurrentUser()

		if (!user) {
			return Response.json(
				{ message: 'Потрібно увійти в обліковий запис' },
				{ status: 401 }
			)
		}

		const notifications = await getUnreadNotifications(user.id)

		return Response.json({ notifications })
	} catch {
		return Response.json(
			{ message: 'Не вдалося отримати сповіщення' },
			{ status: 500 }
		)
	}
}
