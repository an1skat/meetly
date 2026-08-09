import { RegisterForm } from '@/modules/auth/ui/register-form'
import Link from 'next/link'

export default function RegisterPage() {
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
					Почнімо
				</p>
				<h1 className="mt-2 text-3xl font-bold tracking-tight">Реєстрація</h1>
				<p className="mt-2 text-sm leading-6 text-muted">
					Створіть обліковий запис для бронювання кімнат.
				</p>
			</div>

			<RegisterForm />

			<p className="mt-6 text-center text-sm text-muted">
				Вже маєте обліковий запис?{' '}
				<Link
					href="/login"
					className="font-semibold text-lime underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
				>
					Увійти
				</Link>
			</p>
		</section>
	)
}
