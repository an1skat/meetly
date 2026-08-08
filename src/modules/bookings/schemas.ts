import z from 'zod'

const isoUtcDateTime = z
	.iso
	.datetime({ offset: false })
	.refine(
		value => new Date(value).toISOString().slice(0, 10) === value.slice(0, 10),
		{ error: 'Вкажіть коректну дату й час у UTC' }
	)
	.transform(value => new Date(value))

export const createBookingSchema = z.object({
	roomId: z.cuid(),
	title: z
		.string()
		.trim()
		.min(1, { error: 'Вкажіть назву бронювання' })
		.max(100, { error: 'Назва не може бути довшою за 100 символів' }),
	startAt: isoUtcDateTime,
	endAt: isoUtcDateTime
})

export const recurrenceSchema = z.object({
	count: z
		.number({ error: 'Вкажіть кількість бронювань у серії' })
		.int({ error: 'Кількість бронювань має бути цілим числом' })
		.min(2, { error: 'Мінімум 2 бронювання у серії' })
		.max(12, { error: 'Максимум 12 бронювань у серії' })
})

export const createBookingRequestSchema = createBookingSchema.extend({
	recurrence: recurrenceSchema.optional()
})

export const bookingRangeSchema = z
	.object({
		from: isoUtcDateTime,
		to: isoUtcDateTime
	})
	.refine(({ from, to }) => from < to, {
		error: 'Час початку діапазону має бути раніше за час завершення',
		path: ['to']
	})

export type CreateBookingInput = z.infer<typeof createBookingSchema>

export type CreateRecurringBookingInput = CreateBookingInput & {
	repeatCount: z.infer<typeof recurrenceSchema>['count']
}

export const cancelBookingQuerySchema = z.object({
	scope: z.enum(['occurrence', 'series']).default('occurrence')
})

export type CancelBookingScope = z.infer<
	typeof cancelBookingQuerySchema
>['scope']

export const myBookingsQuerySchema = z.object({
	type: z.enum(['upcoming', 'past']).default('upcoming'),
	page: z.coerce.number().int().min(1).default(1)
})

export type MyBookingsType = z.infer<
	typeof myBookingsQuerySchema
>['type']
