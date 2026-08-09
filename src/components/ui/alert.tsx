import type { ReactNode } from 'react'

type AlertProps = {
	children: ReactNode
	title?: string
	variant?: 'info' | 'success' | 'error'
}

const variants = {
	info: 'border-line bg-raised text-ink',
	success: 'border-lime/40 bg-lime-soft text-ink',
	error: 'border-coral/50 bg-coral/10 text-ink'
}

export function Alert({ children, title, variant = 'info' }: AlertProps) {
	return (
		<div
			role={variant === 'error' ? 'alert' : 'status'}
			className={`rounded-2xl border p-4 text-sm ${variants[variant]}`}
		>
			{title && <p className="mb-1 font-semibold">{title}</p>}
			<div className="text-muted">{children}</div>
		</div>
	)
}
