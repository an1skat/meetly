'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	AuthRequestError,
	postAuth
} from '@/modules/auth/api'
import {
	type LoginInput,
	loginSchema
} from '@/modules/auth/schemas'

type LoginResponse = {
	user: {
		id: string
		name: string
		email: string
	}
}

const fields = ['email', 'password'] as const

export function LoginForm() {
	const router = useRouter()
	const {
		clearErrors,
		formState: { errors },
		handleSubmit,
		register,
		setError
	} = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: ''
		}
	})

	const mutation = useMutation<
		LoginResponse,
		AuthRequestError,
		LoginInput
	>({
		mutationFn: (values) =>
			postAuth<LoginResponse>('/api/auth/login', values),
		onSuccess: () => {
			router.replace('/rooms')
			router.refresh()
		},
		onError: (error) => {
			let hasFieldError = false

			for (const field of fields) {
				const message = error.fieldErrors?.[field]?.[0]

				if (message) {
					setError(field, { type: 'server', message })
					hasFieldError = true
				}
			}

			if (!hasFieldError) {
				setError('root.server', {
					type: 'server',
					message: error.message
				})
			}
		}
	})

	const onSubmit = handleSubmit((values) => {
		clearErrors()
		mutation.reset()
		mutation.mutate(values)
	})

	return (
		<form
			noValidate
			aria-busy={mutation.isPending}
			className="grid gap-5"
			onSubmit={onSubmit}
		>
			<Input
				id="email"
				label="Email"
				type="email"
				autoComplete="email"
				disabled={mutation.isPending}
				error={errors.email?.message}
				{...register('email')}
			/>

			<Input
				id="password"
				label="Пароль"
				type="password"
				autoComplete="current-password"
				disabled={mutation.isPending}
				error={errors.password?.message}
				{...register('password')}
			/>

			{errors.root?.server?.message && (
				<Alert variant="error">
					{errors.root.server.message}
				</Alert>
			)}

			<Button
				type="submit"
				className="w-full"
				disabled={mutation.isPending}
			>
				{mutation.isPending ? 'Вхід…' : 'Увійти'}
			</Button>
		</form>
	)
}
