type SpinnerProps = {
	label?: string
}

export function Spinner({ label = 'Завантаження' }: SpinnerProps) {
	return (
		<span
			role="status"
			className="inline-flex items-center"
		>
			<span
				aria-hidden="true"
				className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
			/>
			<span className="sr-only">{label}</span>
		</span>
	)
}
