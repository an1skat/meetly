import { Alert } from '@/components/ui/alert'
import { LoginForm } from '@/modules/auth/ui/login-form'
import Link from 'next/link'

type LoginPageProps = {
	searchParams: Promise<{
		registered?: string | string[]
	}>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const { registered } = await searchParams

	return (
		<section className="rounded-3xl border border-line bg-surface p-6 shadow-2xl shadow-black/20 sm:p-8">
			<div className="mb-6">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-lg font-bold tracking-tight focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime lg:hidden"
				>
					<span className="h-3 w-3 rounded-sm bg-lime" /> Meetly
				</Link>
				<p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-lime lg:mt-0">
					З поверненням
				</p>
				<h1 className="mt-2 text-3xl font-bold tracking-tight">Вхід</h1>
				<p className="mt-2 text-sm leading-6 text-muted">
					Увійдіть, щоб переглядати розклад і свої бронювання.
				</p>
			</div>

			{registered === '1' && (
				<div className="mb-5">
					<Alert variant="success">
						Обліковий запис створено. Тепер увійдіть.
					</Alert>
				</div>
			)}

			<LoginForm />

			<p className="mt-6 text-center text-sm text-muted">
				Ще не маєте облікового запису?{' '}
				<Link
					href="/register"
					className="font-semibold text-lime underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
				>
					Зареєструватися
				</Link>
			</p>
		</section>
	)
}
