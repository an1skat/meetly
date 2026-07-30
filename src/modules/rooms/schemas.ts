import z from 'zod'

export const roomParamsSchema = z.object({
	id: z.cuid()
})
