import { ResendVerificationForm } from '@/modules/auth/ui/resend-verification-form'

type PageProps = {
	searchParams: Promise<{
		email?: string | string[]
	}>
}

export default async function VerifyEmailPendingPage({
	searchParams
}: PageProps) {
	const query = await searchParams
	const email = typeof query.email === 'string' ? query.email : ''

	return (
		<section className="rounded-3xl border border-line bg-surface p-6 text-ink shadow-2xl shadow-black/20 sm:p-8">
			<h1 className="text-2xl font-semibold">Підтвердьте email</h1>

			<p className="mt-2 text-sm text-muted">
				Посилання вже створено. У dev-режимі знайдіть його в логах сервера. Якщо
				воно прострочене, створіть нове.
			</p>

			<div className="mt-6">
				<ResendVerificationForm initialEmail={email} />
			</div>
		</section>
	)
}
