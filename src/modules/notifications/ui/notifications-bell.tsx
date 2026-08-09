'use client'

import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

type UnreadNotification = {
	id: string
	currentBooking: {
		title: string
		room: {
			name: string
		}
	}
}

type NotificationsResponse = {
	notifications: UnreadNotification[]
	message?: string
}

function getNotificationMessage(notification: UnreadNotification) {
	return (
		`Бронювання «${notification.currentBooking.title}» скоро завершується. ` +
		`Після нього кімната «${notification.currentBooking.room.name}» одразу зайнята.`
	)
}

async function fetchNotifications(): Promise<NotificationsResponse> {
	let response: Response

	try {
		response = await fetch('/api/me/notifications', {
			cache: 'no-store'
		})
	} catch {
		throw new Error('Немає зв’язку із сервером. Спробуйте ще раз.')
	}

	const payload = (await response
		.json()
		.catch(() => null)) as NotificationsResponse | null

	if (!response.ok || !payload?.notifications) {
		throw new Error(payload?.message ?? 'Не вдалося отримати сповіщення')
	}

	return payload
}

async function markAsRead(id: string) {
	let response: Response

	try {
		response = await fetch(`/api/me/notifications/${encodeURIComponent(id)}`, {
			method: 'PATCH'
		})
	} catch {
		throw new Error('Немає зв’язку із сервером. Спробуйте ще раз.')
	}

	if (response.ok) {
		return
	}

	const payload = (await response.json().catch(() => null)) as {
		message?: string
	} | null

	throw new Error(payload?.message ?? 'Не вдалося позначити сповіщення')
}

export function NotificationsBell() {
	const queryClient = useQueryClient()
	const [toast, setToast] = useState<UnreadNotification | null>(null)
	const knownIdsRef = useRef<Set<string> | null>(null)

	const query = useQuery({
		queryKey: ['unread-notifications'],
		queryFn: fetchNotifications,
		refetchInterval: 30_000
	})

	const mutation = useMutation<void, Error, string>({
		mutationFn: markAsRead,
		onSuccess: (_data, id) => {
			setToast(current => (current?.id === id ? null : current))

			queryClient.setQueryData<NotificationsResponse>(
				['unread-notifications'],
				current =>
					current
						? {
								...current,
								notifications: current.notifications.filter(
									notification => notification.id !== id
								)
							}
						: current
			)
		}
	})

	useEffect(() => {
		if (!query.data) {
			return
		}

		const ids = new Set(
			query.data.notifications.map(notification => notification.id)
		)
		const knownIds = knownIdsRef.current

		if (knownIds) {
			const newNotification = query.data.notifications.find(
				notification => !knownIds.has(notification.id)
			)

			if (newNotification) {
				setToast(newNotification)
			}
		}

		knownIdsRef.current = ids
	}, [query.data])

	useEffect(() => {
		if (!toast) {
			return
		}

		const timeoutId = window.setTimeout(() => setToast(null), 5000)

		return () => window.clearTimeout(timeoutId)
	}, [toast])

	const notifications = query.data?.notifications ?? []

	const visibleToast =
		toast && notifications.some(notification => notification.id === toast.id)
			? toast
			: null

	return (
		<>
			<details className="relative">
				<summary
					aria-label={`Сповіщення: ${notifications.length} непрочитаних`}
					className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-zinc-200 bg-white text-lg outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-500 [&::-webkit-details-marker]:hidden"
				>
					<span aria-hidden="true">🔔</span>

					{notifications.length > 0 && (
						<span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
							{notifications.length}
						</span>
					)}
				</summary>

				<div
					aria-busy={query.isPending}
					className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-3 shadow-xl"
				>
					<h2 className="px-2 py-1 text-sm font-semibold">Сповіщення</h2>

					{query.isPending ? (
						<p className="p-2 text-sm text-zinc-500">Завантажуємо…</p>
					) : query.isError ? (
						<p
							role="alert"
							className="p-2 text-sm text-red-600"
						>
							{query.error.message}
						</p>
					) : notifications.length === 0 ? (
						<p className="p-2 text-sm text-zinc-500">Нових сповіщень немає.</p>
					) : (
						<ul className="grid gap-2">
							{notifications.map(notification => (
								<li
									key={notification.id}
									className="rounded-lg bg-zinc-50 p-3"
								>
									<p className="text-sm">
										{getNotificationMessage(notification)}
									</p>

									<Button
										className="mt-2 h-9 px-3 focus-visible:ring-2 focus-visible:ring-zinc-500"
										variant="secondary"
										disabled={mutation.isPending}
										onClick={() => mutation.mutate(notification.id)}
									>
										{mutation.isPending &&
										mutation.variables === notification.id
											? 'Зберігаємо…'
											: 'Позначити прочитаним'}
									</Button>
								</li>
							))}
						</ul>
					)}

					{mutation.isError && (
						<p
							role="alert"
							className="p-2 text-sm text-red-600"
						>
							{mutation.error.message}
						</p>
					)}
				</div>
			</details>

			{visibleToast && (
				<div
					role="status"
					className="fixed bottom-4 right-4 z-100 max-w-sm rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-xl"
				>
					{getNotificationMessage(visibleToast)}
				</div>
			)}
		</>
	)
}
