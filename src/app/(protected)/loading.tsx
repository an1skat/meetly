import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
	return (
		<div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted">
			<Spinner label="Завантаження сторінки" />
			<span>Завантаження…</span>
		</div>
	)
}
