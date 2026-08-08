'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CancelBookingDialog } from '@/modules/bookings/ui/cancel-booking-dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

type BookingType = 'upcoming' | 'past'

type MyBooking = {
	id: string
	title: string
	startAt: string
	endAt: string
	canCancel: boolean
	recurringSeriesId: string | null
	room: {
		id: string
		name: string
	}
}

type MyBookingsResponse = {
	bookings: MyBooking[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	} | null
}

type ErrorResponse = {
	message?: string
}

async function fetchMyBookings(
	type: BookingType,
	page: number
): Promise<MyBookingsResponse> {
	const params = new URLSearchParams({
		type
	})

	if (type === 'past') {
		params.set('page', String(page))
	}

	let response: Response

	try {
		response = await fetch(`/api/me/bookings?${params}`)
	} catch {
		throw new Error('Немає зв’язку із сервером. Спробуйте ще раз.')
	}

	const payload = (await response.json().catch(() => null)) as
		| (MyBookingsResponse & ErrorResponse)
		| null

	if (!response.ok || !payload) {
		throw new Error(payload?.message ?? 'Не вдалося отримати бронювання')
	}

	return payload
}

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
	weekday: 'short',
	day: 'numeric',
	month: 'long',
	year: 'numeric'
})

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
	hour: '2-digit',
	minute: '2-digit'
})

export function MyBookingsList() {
	const queryClient = useQueryClient()
	const [type, setType] = useState<BookingType>('upcoming')
	const [page, setPage] = useState(1)
	const [bookingToCancel, setBookingToCancel] = useState<MyBooking | null>(null)

	const query = useQuery({
		queryKey: ['my-bookings', type, page],
		queryFn: () => fetchMyBookings(type, page)
	})

	const bookings = query.data?.bookings ?? []
	const pagination = query.data?.pagination

	const selectType = (nextType: BookingType) => {
		setType(nextType)
		setPage(1)
		setBookingToCancel(null)
	}

	return (
		<div className="space-y-5">
			<div
				role="tablist"
				aria-label="Тип бронювань"
				className="inline-flex rounded-lg border border-zinc-200 bg-white p-1"
			>
				<button
					type="button"
					role="tab"
					aria-selected={type === 'upcoming'}
					className={`min-h-10 rounded-md px-4 text-sm font-medium ${
						type === 'upcoming'
							? 'bg-zinc-900 text-white'
							: 'text-zinc-600 hover:bg-zinc-100'
					}`}
					onClick={() => selectType('upcoming')}
				>
					Майбутні
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={type === 'past'}
					className={`min-h-10 rounded-md px-4 text-sm font-medium ${
						type === 'past'
							? 'bg-zinc-900 text-white'
							: 'text-zinc-600 hover:bg-zinc-100'
					}`}
					onClick={() => selectType('past')}
				>
					Минулі
				</button>
			</div>

			{query.isPending ? (
				<div className="flex min-h-40 items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white">
					<Spinner label="Завантаження бронювань" />
					<span className="text-sm text-zinc-600">
						Завантажуємо бронювання…
					</span>
				</div>
			) : query.isError ? (
				<Alert
					title="Не вдалося завантажити бронювання"
					variant="error"
				>
					<p>{query.error.message}</p>
					<Button
						className="mt-3"
						variant="secondary"
						onClick={() => void query.refetch()}
					>
						Повторити
					</Button>
				</Alert>
			) : bookings.length === 0 ? (
				<Alert
					title={
						type === 'upcoming'
							? 'Майбутніх бронювань немає'
							: 'Минулих бронювань немає'
					}
				>
					{type === 'upcoming'
						? 'Створіть бронювання на сторінці розкладу.'
						: 'Історія бронювань з’явиться тут.'}
				</Alert>
			) : (
				<div className="grid gap-3">
					{bookings.map(booking => {
						const startAt = new Date(booking.startAt)
						const endAt = new Date(booking.endAt)

						return (
							<article
								key={booking.id}
								className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
							>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<h2 className="font-semibold">{booking.title}</h2>

										<dl className="mt-3 grid gap-2 text-sm text-zinc-600">
											<div>
												<dt className="inline font-medium text-zinc-900">
													Дата:{' '}
												</dt>
												<dd className="inline">
													{dateFormatter.format(startAt)}
												</dd>
											</div>

											<div>
												<dt className="inline font-medium text-zinc-900">
													Час:{' '}
												</dt>
												<dd className="inline">
													{timeFormatter.format(startAt)}
													{'–'}
													{timeFormatter.format(endAt)}
												</dd>
											</div>

											<div>
												<dt className="inline font-medium text-zinc-900">
													Кімната:{' '}
												</dt>
												<dd className="inline">{booking.room.name}</dd>
											</div>
										</dl>
									</div>

									<div className="flex flex-wrap gap-2">
										<Link
											href={`/rooms?roomId=${encodeURIComponent(
												booking.room.id
											)}&week=${encodeURIComponent(booking.startAt)}`}
											className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-100"
										>
											Відкрити розклад
										</Link>

										{booking.canCancel && (
											<Button
												variant="danger"
												onClick={() => setBookingToCancel(booking)}
											>
												Скасувати
											</Button>
										)}
									</div>
								</div>
							</article>
						)
					})}
				</div>
			)}

			{type === 'past' && pagination && pagination.totalPages > 1 && (
				<nav
					aria-label="Сторінки минулих бронювань"
					className="flex items-center justify-between gap-3"
				>
					<Button
						variant="secondary"
						disabled={page <= 1 || query.isFetching}
						onClick={() => setPage(value => Math.max(1, value - 1))}
					>
						← Назад
					</Button>

					<span className="text-sm text-zinc-600">
						Сторінка {pagination.page} з {pagination.totalPages}
					</span>

					<Button
						variant="secondary"
						disabled={page >= pagination.totalPages || query.isFetching}
						onClick={() => setPage(value => value + 1)}
					>
						Далі →
					</Button>
				</nav>
			)}

			{bookingToCancel && (
				<CancelBookingDialog
					booking={bookingToCancel}
					onClose={() => setBookingToCancel(null)}
					onCancelled={async () => {
						setBookingToCancel(null)

						await queryClient.invalidateQueries({
							queryKey: ['my-bookings']
						})
					}}
				/>
			)}
		</div>
	)
}
