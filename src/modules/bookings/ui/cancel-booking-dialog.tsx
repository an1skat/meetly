'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { CancelBookingScope } from '@/modules/bookings/schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

type CancelBookingDialogProps = {
	booking: {
		id: string
		title: string
		recurringSeriesId: string | null
	}
	onClose: () => void
	onCancelled: () => void | Promise<void>
}

type CancelBookingResponse = {
	message?: string
}

async function deleteBooking(
	bookingId: string,
	scope: CancelBookingScope
) {
	const params = new URLSearchParams({ scope })
	let response: Response

	try {
		response = await fetch(
			`/api/bookings/${encodeURIComponent(bookingId)}?${params.toString()}`,
			{
				method: 'DELETE'
			}
		)
	} catch {
		throw new Error('Немає зв’язку із сервером. Спробуйте ще раз.')
	}

	if (response.ok) {
		return
	}

	const payload = (await response.json().catch(() => null)) as
		| CancelBookingResponse
		| null

	throw new Error(payload?.message ?? 'Не вдалося скасувати бронювання')
}

export function CancelBookingDialog({
	booking,
	onClose,
	onCancelled
}: CancelBookingDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const [scope, setScope] = useState<CancelBookingScope>('occurrence')
	const mutation = useMutation<void, Error>({
		mutationFn: () => deleteBooking(booking.id, scope),
		onSuccess: onCancelled
	})

	useEffect(() => {
		const dialog = dialogRef.current

		if (dialog && !dialog.open) {
			dialog.showModal()
		}

		return () => {
			if (dialog?.open) {
				dialog.close()
			}
		}
	}, [])

	return (
		<dialog
			ref={dialogRef}
			aria-describedby="cancel-booking-description"
			aria-labelledby="cancel-booking-title"
			className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-black/40"
			role="alertdialog"
			onCancel={event => {
				if (mutation.isPending) {
					event.preventDefault()
				} else {
					onClose()
				}
			}}
		>
			<div className="border-b border-zinc-200 px-5 py-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2
							id="cancel-booking-title"
							className="text-lg font-semibold"
						>
							Скасувати бронювання?
						</h2>
						<p className="mt-1 text-sm text-zinc-600">{booking.title}</p>
					</div>

					<button
						type="button"
						aria-label="Закрити діалог"
						className="rounded p-1 text-xl leading-none text-zinc-500 outline-none hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={mutation.isPending}
						onClick={onClose}
					>
						×
					</button>
				</div>
			</div>

			<div
				aria-busy={mutation.isPending}
				className="grid gap-5 p-5"
			>
				<p
					id="cancel-booking-description"
					className="text-sm text-zinc-600"
				>
					Бронювання буде видалено з розкладу. Цю дію не можна скасувати.
				</p>

				{booking.recurringSeriesId && (
					<fieldset
						className="grid gap-2"
						disabled={mutation.isPending}
					>
						<legend className="text-sm font-medium">
							Що скасувати?
						</legend>

						<label className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-200 px-3">
							<input
								type="radio"
								name="cancel-scope"
								checked={scope === 'occurrence'}
								onChange={() => setScope('occurrence')}
							/>
							Тільки це бронювання
						</label>

						<label className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-200 px-3">
							<input
								type="radio"
								name="cancel-scope"
								checked={scope === 'series'}
								onChange={() => setScope('series')}
							/>
							Усю майбутню серію
						</label>
					</fieldset>
				)}

				{mutation.isError && (
					<Alert variant="error">{mutation.error.message}</Alert>
				)}

				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						autoFocus
						disabled={mutation.isPending}
						variant="secondary"
						onClick={onClose}
					>
						Назад
					</Button>
					<Button
						disabled={mutation.isPending}
						variant="danger"
						onClick={() => mutation.mutate()}
					>
						{mutation.isPending ? 'Скасовуємо…' : 'Скасувати'}
					</Button>
				</div>
			</div>
		</dialog>
	)
}
