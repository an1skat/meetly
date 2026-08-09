import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'danger'
}

const variants = {
	primary: 'border border-lime/60 bg-lime text-lime-ink hover:bg-lime/90',
	secondary: 'border border-line bg-raised text-ink hover:bg-line/70',
	danger: 'border border-coral/70 bg-coral text-lime-ink hover:bg-coral/90'
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
			className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
			{...props}
		/>
	)
}
