import Link from 'next/link'

export function Navigation() {
	return (
		<header className="border-b border-zinc-200 bg-white">
			<nav
				aria-label="Основна навігація"
				className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6"
			>
				<Link
					href="/rooms"
					className="mr-auto text-lg font-semibold"
				>
					Meetly
				</Link>

				<Link
					href="/rooms"
					className="text-sm text-zinc-600 hover:text-zinc-950"
				>
					Розклад
				</Link>

				<Link
					href="/my-bookings"
					className="text-sm text-zinc-600 hover:text-zinc-950"
				>
					Мої бронювання
				</Link>

				<Link
					href="/login"
					className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700"
				>
					Увійти
				</Link>
			</nav>
		</header>
	)
}
