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

const dayFormatter = new Intl.DateTimeFormat('uk-UA', { day: '2-digit' })
const monthFormatter = new Intl.DateTimeFormat('uk-UA', { month: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' })

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
				className="inline-flex rounded-xl border border-line bg-surface p-1"
			>
				<button
					type="button"
					role="tab"
					aria-selected={type === 'upcoming'}
					className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
						type === 'upcoming'
							? 'bg-lime text-lime-ink'
							: 'text-muted hover:bg-raised hover:text-ink'
					}`}
					onClick={() => selectType('upcoming')}
				>
					Майбутні
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={type === 'past'}
					className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
						type === 'past'
							? 'bg-lime text-lime-ink'
							: 'text-muted hover:bg-raised hover:text-ink'
					}`}
					onClick={() => selectType('past')}
				>
					Минулі
				</button>
			</div>

			{query.isPending ? (
				<div className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-line bg-surface">
					<Spinner label="Завантаження бронювань" />
					<span className="text-sm text-muted">
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
								className="rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-black/10 transition-colors hover:border-lime/30 sm:p-5"
							>
								<div className="grid gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center">
									<div className="grid min-h-20 place-items-center rounded-2xl bg-lime-soft px-2 py-2 text-center">
										<span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lime">
											{weekdayFormatter.format(startAt).replace(/\.$/, '')}
										</span>
										<strong className="text-2xl leading-none">
											{dayFormatter.format(startAt)}
										</strong>
										<span className="text-xs text-muted">
											{monthFormatter.format(startAt).replace(/\.$/, '')}
										</span>
									</div>

									<div className="min-w-0">
										<p className="text-xs text-muted">
											{dateFormatter.format(startAt)}
										</p>
										<h2 className="mt-1 truncate text-lg font-bold">
											{booking.title}
										</h2>
										<div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
											<span className="rounded-lg bg-raised px-2.5 py-1">
												{timeFormatter.format(startAt)}–
												{timeFormatter.format(endAt)}
											</span>
											<span className="rounded-lg bg-raised px-2.5 py-1">
												{booking.room.name}
											</span>
										</div>
									</div>

									<div className="flex flex-wrap gap-2">
										<Link
											href={`/rooms?roomId=${encodeURIComponent(
												booking.room.id
											)}&week=${encodeURIComponent(booking.startAt)}`}
											className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-raised px-4 text-sm font-semibold text-ink transition-colors hover:bg-line/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
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

					<span className="text-sm text-muted">
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
