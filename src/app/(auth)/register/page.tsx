import { RegisterForm } from '@/modules/auth/register-form'
import Link from 'next/link'

export default function RegisterPage() {
	return (
		<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
			<div className="mb-6">
				<Link
					href="/"
					className="text-lg font-semibold focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
				>
					Meetly
				</Link>
				<h1 className="mt-6 text-2xl font-semibold">
					Реєстрація
				</h1>
				<p className="mt-2 text-sm text-zinc-600">
					Створіть обліковий запис для бронювання кімнат.
				</p>
			</div>

			<RegisterForm />

			<p className="mt-6 text-center text-sm text-zinc-600">
				Вже маєте обліковий запис?{' '}
				<Link
					href="/login"
					className="font-medium text-zinc-950 underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
				>
					Увійти
				</Link>
			</p>
		</section>
	)
}
