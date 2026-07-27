import type { ReactNode } from 'react'

type AlertProps = {
	children: ReactNode
	title?: string
	variant?: 'info' | 'success' | 'error'
}

const variants = {
	info: 'border-blue-200 bg-blue-50 text-blue-900',
	success: 'border-green-200 bg-green-50 text-green-900',
	error: 'border-red-200 bg-red-50 text-red-900'
}

export function Alert({ children, title, variant = 'info' }: AlertProps) {
	return (
		<div
			role={variant === 'error' ? 'alert' : 'status'}
			className={`rounded-md border p-4 text-sm ${variants[variant]}`}
		>
			{title && <p className="mb-1 font-medium">{title}</p>}
			<div>{children}</div>
		</div>
	)
}
