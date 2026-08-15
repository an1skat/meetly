import type { BookingTimeValidationError } from '@/modules/bookings/time'

export type BookingFailureResponse = {
	status: number
	body: {
		message: string
		fieldErrors: Record<string, string[]>
	}
}

export const bookingWriteFailureResponses: Record<
	BookingTimeValidationError | 'room-not-found' | 'slot-taken',
	BookingFailureResponse
> = {
	order: {
		status: 400,
		body: {
			message: 'Час початку має бути раніше за час завершення',
			fieldErrors: {
				endAt: ['Час завершення має бути пізніше за час початку']
			}
		}
	},
	slot: {
		status: 400,
		body: {
			message: 'Час має відповідати 30-хвилинній сітці',
			fieldErrors: {
				startAt: ['Вкажіть час із кроком 30 хвилин'],
				endAt: ['Вкажіть час із кроком 30 хвилин']
			}
		}
	},
	duration: {
		status: 400,
		body: {
			message:
				'Тривалість бронювання має становити від 30 хвилин до 4 годин',
			fieldErrors: {
				endAt: [
					'Тривалість бронювання має становити від 30 хвилин до 4 годин'
				]
			}
		}
	},
	'office-hours': {
		status: 400,
		body: {
			message: 'Бронювання має бути в межах 09:00–19:00 за київським часом',
			fieldErrors: {
				startAt: ['Робочі години: 09:00–19:00 за київським часом'],
				endAt: ['Робочі години: 09:00–19:00 за київським часом']
			}
		}
	},
	past: {
		status: 400,
		body: {
			message: 'Бронювання має починатися в майбутньому',
			fieldErrors: {
				startAt: ['Вкажіть час у майбутньому']
			}
		}
	},
	'room-not-found': {
		status: 404,
		body: {
			message: 'Кімнату не знайдено',
			fieldErrors: {
				roomId: ['Кімнату не знайдено']
			}
		}
	},
	'slot-taken': {
		status: 409,
		body: {
			message: 'Цей слот уже зайнятий',
			fieldErrors: {
				startAt: ['Цей слот уже зайнятий'],
				endAt: ['Цей слот уже зайнятий']
			}
		}
	}
}
