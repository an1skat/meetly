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
		<div className="flex min-h-screen flex-col bg-canvas text-ink">
			<Navigation user={user} />

			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
				{!user.emailVerifiedAt && (
					<div className="mb-6">
						<Alert title="Підтвердьте email">
							<p>
								Перегляд розкладу доступний, але створювати бронювання можна
								лише після підтвердження email.
							</p>

							<Link
								href={`/verify-email/pending?email=${encodeURIComponent(user.email)}`}
								className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-lime/60 bg-lime px-4 font-semibold text-lime-ink transition-colors hover:bg-lime/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
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
