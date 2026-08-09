'use client'

import { LogoutButton } from '@/modules/auth/ui/logout-button'
import { NotificationsBell } from '@/modules/notifications/ui/notifications-bell'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavigationProps = {
	user: {
		name: string
		email: string
	}
}

export function Navigation({ user }: NavigationProps) {
	const pathname = usePathname()
	const initials = user.name.slice(0, 2).toUpperCase()
	const linkClassName = (href: string) =>
		`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
			pathname === href
				? 'bg-raised text-ink shadow-sm'
				: 'text-muted hover:text-ink'
		}`

	return (
		<header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
			<nav
				aria-label="Основна навігація"
				className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6"
			>
				<Link
					href="/rooms"
					className="mr-auto inline-flex items-center gap-2.5 rounded-lg text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
				>
					<span
						aria-hidden="true"
						className="flex h-7 w-7 items-end justify-center gap-0.5 rounded-lg bg-lime p-1.5"
					>
						<span className="h-2 w-1 rounded-full bg-lime-ink" />
						<span className="h-4 w-1 rounded-full bg-lime-ink" />
						<span className="h-3 w-1 rounded-full bg-lime-ink" />
					</span>
					<span>Meetly</span>
				</Link>

				<div className="order-3 flex w-full items-center gap-1 rounded-xl border border-line bg-canvas/60 p-1 sm:order-0 sm:w-auto">
					<Link
						href="/rooms"
						className={linkClassName('/rooms')}
					>
						Розклад
					</Link>

					<Link
						href="/my-bookings"
						className={linkClassName('/my-bookings')}
					>
						Мої бронювання
					</Link>
				</div>

				<NotificationsBell />

				<div className="hidden items-center gap-2.5 md:flex">
					<span className="grid h-9 w-9 place-items-center rounded-full bg-lime-soft text-xs font-bold text-lime">
						{initials}
					</span>
					<div>
						<p className="text-sm font-semibold">{user.name}</p>
						<p className="text-xs text-muted">{user.email}</p>
					</div>
				</div>

				<LogoutButton />
			</nav>
		</header>
	)
}
