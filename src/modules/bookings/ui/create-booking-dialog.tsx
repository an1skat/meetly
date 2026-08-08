import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	createBookingSchema,
	recurrenceSchema
} from '@/modules/bookings/schemas'
import {
	getAvailableBookingDurations,
	SLOT_MINUTES
} from '@/modules/bookings/time'
import {
	formatTimeInTimeZone
} from '@/modules/rooms/schedule'

const bookingFormSchema = z.object({
	title: createBookingSchema.shape.title
})

type BookingFormValues = z.infer<typeof bookingFormSchema>
type BookingMutationValues = BookingFormValues & {
	durationMinutes: number
	repeatWeekly: boolean
	repeatCount: number
}
type BookingFieldErrors = Partial<
	Record<'roomId' | 'title' | 'startAt' | 'endAt' | 'recurrence', string[]>
>

type BookingErrorResponse = {
	message?: string
	fieldErrors?: BookingFieldErrors
}

type CreateBookingDialogProps = {
	room: {
		id: string
		name: string
		bookings: Array<{
			startAt: string
			endAt: string
		}>
	}
	startAt: Date
	timeZone: string
	onClose: () => void
	onConflict: () => void
	onCreated: () => void
}

class BookingRequestError extends Error {
	constructor(
		message: string,
		readonly status?: number,
		readonly fieldErrors?: BookingFieldErrors
	) {
		super(message)
		this.name = 'BookingRequestError'
	}
}

async function postBooking(
	values: BookingMutationValues,
	roomId: string,
	startAt: Date
) {
	const endAt = new Date(
		startAt.getTime() + values.durationMinutes * 60_000
	)

	let response: Response

	try {
		response = await fetch('/api/bookings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				roomId,
				title: values.title,
				startAt: startAt.toISOString(),
				endAt: endAt.toISOString(),
				recurrence: values.repeatWeekly
					? {
							count: values.repeatCount
						}
					: undefined
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
			payload?.message ?? 'Не вдалося створити бронювання',
			response.status,
			payload?.fieldErrors
		)
	}
}

export function CreateBookingDialog({
	room,
	startAt,
	timeZone,
	onClose,
	onConflict,
	onCreated
}: CreateBookingDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const durationOptions = getAvailableBookingDurations(
		startAt,
		room.bookings.map(booking => ({
			startAt: new Date(booking.startAt),
			endAt: new Date(booking.endAt)
		}))
	)
	const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(
		durationOptions[0] ?? SLOT_MINUTES
	)
	const [repeatWeekly, setRepeatWeekly] = useState(false)
	const [repeatCount, setRepeatCount] = useState(8)
	const repeatCountResult = recurrenceSchema.shape.count.safeParse(repeatCount)
	const repeatCountError =
		repeatWeekly && !repeatCountResult.success
			? repeatCountResult.error.issues[0]?.message
			: undefined
	const dateLabel = new Intl.DateTimeFormat('uk-UA', {
		timeZone,
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(startAt)
	const startTimeLabel = formatTimeInTimeZone(startAt, timeZone)
	const {
		clearErrors,
		formState: { errors },
		handleSubmit,
		register,
		setError,
		setFocus
	} = useForm<BookingFormValues>({
		resolver: zodResolver(bookingFormSchema),
		defaultValues: {
			title: ''
		}
	})

	const mutation = useMutation<void, BookingRequestError, BookingMutationValues>({
		mutationFn: values => postBooking(values, room.id, startAt),
		onSuccess: onCreated,
		onError: error => {
			const titleError = error.fieldErrors?.title?.[0]

			if (titleError) {
				setError('title', { type: 'server', message: titleError })
			}

			const roomError = error.fieldErrors?.roomId?.[0]
			const recurrenceError = error.fieldErrors?.recurrence?.[0]
			const timeError =
				error.fieldErrors?.startAt?.[0] ?? error.fieldErrors?.endAt?.[0]

			if (roomError || timeError || recurrenceError || !titleError) {
				setError('root.server', {
					type: 'server',
					message:
						roomError ?? timeError ?? recurrenceError ?? error.message
				})
			}

			if (error.status === 409) {
				onConflict()
			}
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
				message: 'Оберіть доступну тривалість'
			})
			return
		}

		if (repeatWeekly && !repeatCountResult.success) {
			return
		}

		mutation.mutate({
			...values,
			durationMinutes: selectedDurationMinutes,
			repeatWeekly,
			repeatCount
		})
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
			aria-labelledby="create-booking-title"
			className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-black/40"
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
							id="create-booking-title"
							className="text-lg font-semibold"
						>
							Нове бронювання
						</h2>
						<p className="mt-1 text-sm text-zinc-600">{room.name}</p>
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

			<form
				noValidate
				aria-busy={mutation.isPending}
				className="grid gap-5 p-5"
				onSubmit={onSubmit}
			>
				<Input
					id="booking-title"
					label="Назва"
					autoFocus
					autoComplete="off"
					disabled={mutation.isPending}
					error={errors.title?.message}
					maxLength={100}
					placeholder="Наприклад, планування спринту"
					{...register('title')}
				/>

				<div className="rounded-lg bg-zinc-50 p-4">
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-xs text-zinc-500">Дата</dt>
							<dd className="mt-1 font-medium capitalize">{dateLabel}</dd>
						</div>
						<div>
							<dt className="text-xs text-zinc-500">Початок</dt>
							<dd className="mt-1 font-medium">{startTimeLabel}</dd>
						</div>
					</dl>
					<p className="mt-3 text-xs text-zinc-500">
						Щоб змінити дату або початок, закрийте вікно та оберіть інший
						зелений слот.
					</p>
				</div>

				<div className="grid gap-3">
					<label className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-300 px-3 text-sm">
						<input
							type="checkbox"
							checked={repeatWeekly}
							disabled={mutation.isPending}
							onChange={event => setRepeatWeekly(event.target.checked)}
						/>

						Повторювати щотижня
					</label>

					{repeatWeekly && (
						<div className="grid gap-1">
							<Input
								id="repeat-count"
								label="Кількість бронювань у серії"
								type="number"
								min={2}
								max={12}
								step={1}
								value={repeatCount}
								error={repeatCountError}
								disabled={mutation.isPending}
								onChange={event =>
									setRepeatCount(Number(event.target.value))
								}
							/>

							<p className="text-xs text-zinc-500">
								Від 2 до 12, разом із поточним бронюванням.
							</p>
						</div>
					)}
				</div>

				<fieldset className="grid gap-2">
					<legend className="text-sm font-medium">Тривалість</legend>
					<p className="text-xs text-zinc-500">
						Показані лише варіанти до наступної зустрічі та кінця робочого
						дня.
					</p>

					<div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
						{durationOptions.map(durationMinutes => {
							const optionEndAt = new Date(
								startAt.getTime() + durationMinutes * 60_000
							)

							return (
								<label
									key={durationMinutes}
									className="cursor-pointer"
								>
									<input
										type="radio"
										className="peer sr-only"
										checked={selectedDurationMinutes === durationMinutes}
										disabled={mutation.isPending}
										value={durationMinutes}
										onChange={() => setSelectedDurationMinutes(durationMinutes)}
									/>
									<span className="flex min-h-14 flex-col items-center justify-center rounded-md border border-zinc-300 bg-white px-2 text-center text-sm transition-colors peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
										<span className="font-medium">
											{formatDuration(durationMinutes)}
										</span>
										<span className="text-xs opacity-70">
											до {formatTimeInTimeZone(optionEndAt, timeZone)}
										</span>
									</span>
								</label>
							)
						})}
					</div>
				</fieldset>

				{durationOptions.length === 0 && (
					<Alert variant="error">
						Цей слот уже недоступний. Закрийте вікно та оберіть інший.
					</Alert>
				)}

				<p className="text-xs text-zinc-500">
					Час указано у вашому часовому поясі: {timeZone}.
				</p>

				{errors.root?.server?.message && (
					<Alert variant="error">{errors.root.server.message}</Alert>
				)}

				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						disabled={mutation.isPending}
						variant="secondary"
						onClick={onClose}
					>
						Скасувати
					</Button>
					<Button
						type="submit"
						disabled={mutation.isPending || durationOptions.length === 0}
					>
						{mutation.isPending ? 'Створення…' : 'Створити бронювання'}
					</Button>
				</div>
			</form>
		</dialog>
	)
}
