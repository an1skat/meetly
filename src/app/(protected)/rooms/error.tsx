'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function RoomsError({ reset }: { reset: () => void }) {
	return (
		<Alert
			title="Не вдалося завантажити кімнати"
			variant="error"
		>
			<p>Перевірте з’єднання та спробуйте ще раз.</p>
			<Button
				className="mt-3"
				onClick={reset}
			>
				Спробувати ще раз
			</Button>
		</Alert>
	)
}
