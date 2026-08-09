import { Alert } from '@/components/ui/alert'
import { ResendVerificationForm } from '@/modules/auth/ui/resend-verification-form'
import { getCurrentUser } from '@/server/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'

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
		const user = await getCurrentUser()

		if (user?.emailVerifiedAt) {
			redirect('/rooms?emailVerified=1')
		}

		return (
			<section className="rounded-3xl border border-line bg-surface p-6 text-ink shadow-2xl shadow-black/20 sm:p-8">
				<Alert
					title="Email підтверджено"
					variant="success"
				>
					Тепер ви можете створювати бронювання.
				</Alert>

				<Link
					href="/login"
					className="mt-6 inline-block rounded-sm font-semibold text-lime underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
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
		<section className="rounded-3xl border border-line bg-surface p-6 text-ink shadow-2xl shadow-black/20 sm:p-8">
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
