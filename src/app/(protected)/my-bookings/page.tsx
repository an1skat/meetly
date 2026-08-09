import { MyBookingsList } from '@/modules/bookings/ui/my-bookings-list'

export default function MyBookingsPage() {
	return (
		<section className="space-y-7">
			<header className="max-w-3xl">
				<p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-lime">
					Особистий календар
				</p>
				<h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
					Мої бронювання
				</h1>
				<p className="mt-3 text-base text-muted">
					Переглядайте майбутні зустрічі та історію бронювань.
				</p>
			</header>

			<MyBookingsList />
		</section>
	)
}
