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
		<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
			<h1 className="text-2xl font-semibold">Підтвердьте email</h1>

			<p className="mt-2 text-sm text-zinc-600">
				Посилання вже створено. У dev-режимі знайдіть його в логах сервера. Якщо
				воно прострочене, створіть нове.
			</p>

			<div className="mt-6">
				<ResendVerificationForm initialEmail={email} />
			</div>
		</section>
	)
}
