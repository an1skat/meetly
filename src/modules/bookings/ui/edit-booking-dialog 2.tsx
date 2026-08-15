import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBookingSchema } from '@/modules/bookings/schemas'
import { getAvailableBookingDurations } from '@/modules/bookings/time'

const editBookingFormSchema = z.object({
	title: createBookingSchema.shape.title
})

type EditBookingFormValues = z.infer<typeof editBookingFormSchema>
type BookingMutationValues = EditBookingFormValues & {
	durationMinutes: number
}
type BookingFieldErrors = Partial<
	Record<'title' | 'startAt' | 'endAt', string[]>
>

type BookingErrorResponse = {
	message?: string
	fieldErrors?: BookingFieldErrors
}

type EditBookingDialogProps = {
	booking: {
		id: string
		title: string
		startAt: string
		endAt: string
		room: { name: string }
		recurringSeriesId: string | null
	}
	onClose: () => void
	onUpdated: () => void
}

class BookingRequestError extends Error {
	constructor(
		message: string,
		readonly fieldErrors?: BookingFieldErrors
	) {
		super(message)
		this.name = 'BookingRequestError'
	}
}

async function patchBooking(
	bookingId: string,
	startAt: Date,
	values: BookingMutationValues
) {
	const endAt = new Date(
		startAt.getTime() + values.durationMinutes * 60_000
	)
	let response: Response

	try {
		response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: values.title,
				endAt: endAt.toISOString()
			})
		})
	} catch {
		throw new BookingRequestError(
			'Немає зв’язку із сервером. Спробуйте ще раз.'
		)
	}

	const payload = (await response.json().catch(() => null)) as
		| BookingErrorResponse
		| null

	if (!response.ok) {
		throw new BookingRequestError(
			payload?.message ?? 'Не вдалося оновити бронювання',
			payload?.fieldErrors
		)
	}
}

export function EditBookingDialog({
	booking,
	onClose,
	onUpdated
}: EditBookingDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const startAt = new Date(booking.startAt)
	const endAt = new Date(booking.endAt)
	const currentDurationMinutes =
		(endAt.getTime() - startAt.getTime()) / 60_000
	const durationOptions = getAvailableBookingDurations(startAt, []).filter(
		durationMinutes => durationMinutes >= currentDurationMinutes
	)
	const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(
		currentDurationMinutes
	)
	const dateLabel = new Intl.DateTimeFormat('uk-UA', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(startAt)
	const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
		hour: '2-digit',
		minute: '2-digit'
	})
	const {
		clearErrors,
		formState: { errors },
		handleSubmit,
		register,
		setError,
		setFocus
	} = useForm<EditBookingFormValues>({
		resolver: zodResolver(editBookingFormSchema),
		defaultValues: {
			title: booking.title
		}
	})
	const mutation = useMutation<void, BookingRequestError, BookingMutationValues>({
		mutationFn: values => patchBooking(booking.id, startAt, values),
		onSuccess: onUpdated,
		onError: error => {
			const titleError = error.fieldErrors?.title?.[0]

			if (titleError) {
				setError('title', { type: 'server', message: titleError })
			}

			setError('root.server', {
				type: 'server',
				message: error.message
			})
		}
	})

	useEffect(() => {
		const dialog = dialogRef.current

		if (dialog && !dialog.open) {
			dialog.showModal()
			setFocus('title')
		}

		return () => {
			if (dialog?.open) {
				dialog.close()
			}
		}
	}, [setFocus])

	const onSubmit = handleSubmit(values => {
		clearErrors()
		mutation.reset()

		if (!durationOptions.includes(selectedDurationMinutes)) {
			setError('root.server', {
				type: 'client',
				message: 'Оберіть поточну або більшу тривалість'
			})
			return
		}

		mutation.mutate({ ...values, durationMinutes: selectedDurationMinutes })
	})
	const formatDuration = (minutes: number) => {
		const hours = Math.floor(minutes / 60)
		const remainingMinutes = minutes % 60

		return [hours ? `${hours} год` : '', remainingMinutes ? '30 хв' : '']
			.filter(Boolean)
			.join(' ')
	}

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="edit-booking-title"
			className="m-auto max-h-[calc(100dvh-1rem)] w-[min(32rem,calc(100%-1rem))] overflow-y-auto rounded-3xl border border-line bg-raised p-0 text-ink shadow-2xl shadow-black/30 backdrop:bg-black/65 backdrop:backdrop-blur-sm"
			onCancel={event => {
				if (mutation.isPending) {
					event.preventDefault()
				} else {
					onClose()
				}
			}}
		>
			<div className="sticky top-0 z-10 border-b border-line bg-raised px-4 py-3 sm:px-5 sm:py-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 id="edit-booking-title" className="text-lg font-semibold">
							Редагувати бронювання
						</h2>
						<p className="mt-1 text-sm text-muted">{booking.room.name}</p>
					</div>

					<button
						type="button"
						aria-label="Закрити діалог"
						className="grid h-11 w-11 place-items-center rounded-xl text-xl leading-none text-muted outline-none hover:bg-line/70 hover:text-ink focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
						disabled={mutation.isPending}
						onClick={onClose}
					>
						×
					</button>
				</div>
			</div>

			<form
				noValidate
				aria-busy={mutation.isPending}
				className="grid gap-4 p-4 sm:gap-5 sm:p-5"
				onSubmit={onSubmit}
			>
				<Input
					id="edit-booking-title-input"
					label="Назва"
					autoComplete="off"
					disabled={mutation.isPending}
					error={errors.title?.message}
					maxLength={100}
					{...register('title')}
				/>

				<div className="rounded-2xl bg-surface p-4">
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-xs text-muted">Дата</dt>
							<dd className="mt-1 font-medium capitalize">{dateLabel}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted">Початок</dt>
							<dd className="mt-1 font-medium">
								{timeFormatter.format(startAt)}
							</dd>
						</div>
					</dl>
					<p className="mt-3 text-xs text-muted">
						Щоб змінити дату або час початку, скасуйте це бронювання та
						створіть нове.
					</p>
				</div>

				<fieldset className="grid gap-2">
					<legend className="text-sm font-medium">Тривалість</legend>
					<p className="text-xs text-muted">
						Можна залишити поточну тривалість або продовжити бронювання.
					</p>

					<div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
						{durationOptions.map(durationMinutes => {
							const optionEndAt = new Date(
								startAt.getTime() + durationMinutes * 60_000
							)

							return (
								<label key={durationMinutes} className="cursor-pointer">
									<input
										type="radio"
										className="peer sr-only"
										checked={selectedDurationMinutes === durationMinutes}
										disabled={mutation.isPending}
										value={durationMinutes}
										onChange={() =>
											setSelectedDurationMinutes(durationMinutes)
										}
									/>
									<span className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-line bg-surface px-2 text-center text-sm transition-colors peer-checked:border-lime peer-checked:bg-lime peer-checked:text-lime-ink peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-raised peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
										<span className="font-medium">
											{formatDuration(durationMinutes)}
										</span>
										<span className="text-xs opacity-70">
											до {timeFormatter.format(optionEndAt)}
										</span>
									</span>
								</label>
							)
						})}
					</div>
				</fieldset>

				<div className="space-y-1 text-xs text-muted">
					<p>Час указано у часовому поясі вашого браузера.</p>
					{booking.recurringSeriesId && (
						<p>Інші бронювання цієї серії залишаться без змін.</p>
					)}
				</div>

				{errors.root?.server?.message && (
					<Alert variant="error">{errors.root.server.message}</Alert>
				)}

				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						className="min-h-11"
						disabled={mutation.isPending}
						variant="secondary"
						onClick={onClose}
					>
						Скасувати
					</Button>
					<Button
						type="submit"
						className="min-h-11"
						disabled={mutation.isPending || durationOptions.length === 0}
					>
						{mutation.isPending ? 'Збереження…' : 'Зберегти зміни'}
					</Button>
				</div>
			</form>
		</dialog>
	)
}
