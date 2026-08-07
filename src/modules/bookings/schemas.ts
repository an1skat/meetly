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

export const myBookingsQuerySchema = z.object({
	type: z.enum(['upcoming', 'past']).default('upcoming'),
	page: z.coerce.number().int().min(1).default(1)
})

export type MyBookingsType = z.infer<
	typeof myBookingsQuerySchema
>['type']