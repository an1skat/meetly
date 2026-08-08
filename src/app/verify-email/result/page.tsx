import { Alert } from '@/components/ui/alert'
import { ResendVerificationForm } from '@/modules/auth/ui/resend-verification-form'
import Link from 'next/link'

type PageProps = {
	searchParams: Promise<{
		status?: string | string[]
		email?: string | string[]
	}>
}

export default async function VerifyEmailResultPage({
	searchParams
}: PageProps) {
	const query = await searchParams
	const status = typeof query.status === 'string' ? query.status : 'invalid'
	const email = typeof query.email === 'string' ? query.email : ''

	if (status === 'success') {
		return (
			<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
				<Alert
					title="Email підтверджено"
					variant="success"
				>
					Тепер ви можете створювати бронювання.
				</Alert>

				<Link
					href="/login"
					className="mt-6 inline-block rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
				>
					Перейти до входу
				</Link>
			</section>
		)
	}

	const failure =
		status === 'expired'
			? {
					title: 'Посилання прострочене',
					message:
						'Термін дії посилання минув. Створіть нове посилання для підтвердження.'
				}
			: status === 'error'
				? {
						title: 'Не вдалося підтвердити email',
						message:
							'Сталася помилка. Спробуйте ще раз або створіть нове посилання.'
					}
				: {
						title: 'Посилання недійсне',
						message:
							'Посилання вже використане або неправильне. Створіть нове посилання.'
					}

	return (
		<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
			<Alert
				title={failure.title}
				variant="error"
			>
				{failure.message}
			</Alert>

			<div className="mt-6">
				<ResendVerificationForm initialEmail={email} />
			</div>
		</section>
	)
}
