import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'danger'
}

const variants = {
	primary: 'bg-zinc-900 text-white hover:bg-zinc-700',
	secondary: 'border border-zinc-300 bg-white hover:bg-zinc-100',
	danger: 'bg-red-600 text-white hover:bg-red-500'
}

export function Button({
	className = '',
	variant = 'primary',
	type = 'button',
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
			{...props}
		/>
	)
}
