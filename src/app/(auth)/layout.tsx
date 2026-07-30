import { getCurrentUser } from '@/server/auth/session'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getCurrentUser()

	if (user) {
		redirect('/rooms')
	}

	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-10">
			<div className="w-full max-w-md">{children}</div>
		</main>
	)
}
