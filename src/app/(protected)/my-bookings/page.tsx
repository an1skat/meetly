import { MyBookingsList } from '@/modules/bookings/ui/my-bookings-list'

export default function MyBookingsPage() {
	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Мої бронювання</h1>
				<p className="mt-2 text-sm text-zinc-600">
					Переглядайте майбутні зустрічі та історію бронювань.
				</p>
			</header>

			<MyBookingsList />
		</section>
	)
}
