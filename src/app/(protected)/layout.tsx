import { Navigation } from '@/components/navigation'
import { requireUser } from '@/server/auth/session'

export default async function ProtectedLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await requireUser()

	return (
		<div className="flex min-h-screen flex-col">
			<Navigation user={user} />

			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
				{children}
			</main>
		</div>
	)
}
