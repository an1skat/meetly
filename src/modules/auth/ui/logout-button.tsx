'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
	AuthRequestError,
	postAuth
} from '@/modules/auth/api'

export function LogoutButton() {
	const router = useRouter()
	const mutation = useMutation<void, AuthRequestError, void>({
		mutationFn: () => postAuth<void>('/api/auth/logout'),
		onSuccess: () => {
			router.replace('/login')
			router.refresh()
		}
	})

	return (
		<div className="grid justify-items-end gap-1">
			<Button
				className="h-9 px-3"
				variant="secondary"
				disabled={mutation.isPending}
				onClick={() => mutation.mutate()}
			>
				{mutation.isPending ? 'Вихід…' : 'Вийти'}
			</Button>

			{mutation.isError && (
				<p
					role="alert"
					className="max-w-48 text-right text-xs text-coral"
				>
					{mutation.error.message}
				</p>
			)}
		</div>
	)
}
