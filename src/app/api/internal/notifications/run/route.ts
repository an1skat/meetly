import { env } from '@/lib/env'
import { generateNextBookingNotifications } from '@/server/notifications/generate'

export async function POST(request: Request) {
	if (!env.CRON_SECRET) {
		return Response.json({ message: 'Cron is not configured' }, { status: 503 })
	}

	const authorization = request.headers.get('authorization')

	if (authorization !== `Bearer ${env.CRON_SECRET}`) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}

	try {
		const created = await generateNextBookingNotifications()

		return Response.json({ created })
	} catch {
		return Response.json(
			{ message: 'Failed to generate notifications' },
			{ status: 500 }
		)
	}
}
