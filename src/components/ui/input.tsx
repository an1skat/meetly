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
			<div className="grid min-w-0 gap-1.5">
				<label
					htmlFor={id}
					className="text-sm font-semibold text-ink"
				>
					{label}
				</label>

				<input
					ref={ref}
					id={id}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					className={`h-10 min-w-0 w-full rounded-xl border border-line bg-raised px-3 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-lime focus:ring-2 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
					{...props}
				/>

				{error && (
					<p
						id={errorId}
						className="text-sm text-coral"
					>
						{error}
					</p>
				)}
			</div>
		)
	}
)

Input.displayName = 'Input'
