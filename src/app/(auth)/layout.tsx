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
		<main className="min-h-screen bg-canvas px-4 py-8 text-ink sm:px-6 lg:grid lg:place-items-center lg:py-12">
			<div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_28rem]">
				<section className="hidden max-w-xl lg:block">
					<div className="mb-10 inline-flex items-center gap-3 text-xl font-bold tracking-tight">
						<span className="flex h-9 w-9 items-end justify-center gap-0.5 rounded-xl bg-lime p-2">
							<span className="h-2 w-1 rounded-full bg-lime-ink" />
							<span className="h-5 w-1 rounded-full bg-lime-ink" />
							<span className="h-3 w-1 rounded-full bg-lime-ink" />
						</span>
						Meetly
					</div>
					<p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-lime">
						Простір для зустрічей
					</p>
					<h2 className="text-5xl font-bold leading-[1.02] tracking-[-0.05em]">
						Менше пошуків кімнати. Більше хороших розмов.
					</h2>
					<p className="mt-6 max-w-lg text-base leading-7 text-muted">
						Знайдіть вільний час, забронюйте кімнату й повертайтеся до
						роботи — без зайвих календарів.
					</p>
				</section>

				<div className="w-full">{children}</div>
			</div>
		</main>
	)
}
