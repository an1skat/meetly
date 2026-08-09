import z from 'zod'

export const roomParamsSchema = z.object({
	id: z.cuid()
})

export const roomsQuerySchema = z.object({
	minCapacity: z.coerce.number().int().positive().optional()
})
