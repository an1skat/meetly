import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
	id: string
	label: string
	error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ id, label, error, className = '', ...props }, ref) => {
		const errorId = `${id}-error`

		return (
			<div className="grid gap-1.5">
				<label
					htmlFor={id}
					className="text-sm font-medium"
				>
					{label}
				</label>

				<input
					ref={ref}
					id={id}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					className={`h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-100 ${className}`}
					{...props}
				/>

				{error && (
					<p
						id={errorId}
						className="text-sm text-red-600"
					>
						{error}
					</p>
				)}
			</div>
		)
	}
)

Input.displayName = 'Input'
