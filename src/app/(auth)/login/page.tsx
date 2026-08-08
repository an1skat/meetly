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
		<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
			<div className="mb-6">
				<Link
					href="/"
					className="text-lg font-semibold focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
				>
					Meetly
				</Link>
				<h1 className="mt-6 text-2xl font-semibold">Вхід</h1>
				<p className="mt-2 text-sm text-zinc-600">
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

			<p className="mt-6 text-center text-sm text-zinc-600">
				Ще не маєте облікового запису?{' '}
				<Link
					href="/register"
					className="font-medium text-zinc-950 underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
				>
					Зареєструватися
				</Link>
			</p>
		</section>
	)
}
