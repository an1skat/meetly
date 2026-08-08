'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthRequestError, postAuth } from '@/modules/auth/api'
import {
	type ResendVerificationInput,
	resendVerificationSchema
} from '@/modules/auth/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

export function ResendVerificationForm({
	initialEmail = ''
}: {
	initialEmail?: string
}) {
	const {
		clearErrors,
		formState: { errors },
		handleSubmit,
		register,
		setError
	} = useForm<ResendVerificationInput>({
		resolver: zodResolver(resendVerificationSchema),
		defaultValues: {
			email: initialEmail
		}
	})

	const mutation = useMutation<void, AuthRequestError, ResendVerificationInput>(
		{
			mutationFn: values =>
				postAuth<void>('/api/auth/verify-email/resend', values),
			onError: error => {
				const emailError = error.fieldErrors?.email?.[0]

				if (emailError) {
					setError('email', {
						type: 'server',
						message: emailError
					})
					return
				}

				setError('root.server', {
					type: 'server',
					message: error.message
				})
			}
		}
	)

	const onSubmit = handleSubmit(values => {
		clearErrors()
		mutation.reset()
		mutation.mutate(values)
	})

	return (
		<form
			noValidate
			aria-busy={mutation.isPending}
			className="grid gap-4"
			onSubmit={onSubmit}
		>
			<Input
				id="verification-email"
				label="Email"
				type="email"
				autoComplete="email"
				disabled={mutation.isPending}
				error={errors.email?.message}
				{...register('email')}
			/>

			{mutation.isSuccess && (
				<Alert variant="success">
					Якщо обліковий запис існує й email ще не підтверджено, нове посилання
					створено. У dev-режимі воно з’явиться в логах сервера.
				</Alert>
			)}

			{errors.root?.server?.message && (
				<Alert variant="error">{errors.root.server.message}</Alert>
			)}

			<Button
				type="submit"
				disabled={mutation.isPending}
			>
				{mutation.isPending ? 'Створюємо…' : 'Створити нове посилання'}
			</Button>
		</form>
	)
}
