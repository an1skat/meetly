import { deleteCurrentSession } from '@/server/auth/session'

export async function POST() {
	try {
		await deleteCurrentSession()

		return new Response(null, { status: 204 })
	} catch {
		return Response.json(
			{ message: 'Не вдалося завершити сеанс' },
			{ status: 500 }
		)
	}
}
