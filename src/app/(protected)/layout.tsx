import { Alert } from '@/components/ui/alert'
import { Navigation } from '@/components/navigation'
import { requireUser } from '@/server/auth/session'
import Link from 'next/link'

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
				{!user.emailVerifiedAt && (
					<div className="mb-6">
						<Alert title="Підтвердьте email">
							<p>
								Перегляд розкладу доступний, але створювати бронювання можна
								лише після підтвердження email.
							</p>

							<Link
								href={`/verify-email/pending?email=${encodeURIComponent(user.email)}`}
								className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
							>
								Підтвердити email
							</Link>
						</Alert>
					</div>
				)}

				{children}
			</main>
		</div>
	)
}
