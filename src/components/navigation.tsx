import { LogoutButton } from '@/modules/auth/ui/logout-button'
import Link from 'next/link'

type NavigationProps = {
	user: {
		name: string
		email: string
	}
}

const linkClassName =
	'rounded-sm text-sm text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900'

export function Navigation({ user }: NavigationProps) {
	return (
		<header className="border-b border-zinc-200 bg-white">
			<nav
				aria-label="Основна навігація"
				className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6"
			>
				<Link
					href="/rooms"
					className="mr-auto rounded-sm text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
				>
					Meetly
				</Link>

				<div className="order-3 flex w-full items-center gap-4 sm:order-0 sm:w-auto sm:gap-6">
					<Link
						href="/rooms"
						className={linkClassName}
					>
						Розклад
					</Link>

					<Link
						href="/my-bookings"
						className={linkClassName}
					>
						Мої бронювання
					</Link>
				</div>

				<div className="hidden text-right md:block">
					<p className="text-sm font-medium">{user.name}</p>
					<p className="text-xs text-zinc-500">{user.email}</p>
				</div>

				<LogoutButton />
			</nav>
		</header>
	)
}
