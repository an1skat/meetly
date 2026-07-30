import { getCurrentUser } from '@/server/auth/session'
import { redirect } from 'next/navigation'

export default async function HomePage() {
	const user = await getCurrentUser()

	redirect(user ? '/rooms' : '/login')
}
