import z from 'zod'

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().trim().min(1)
})

export const env = serverEnvSchema.parse({
	DATABASE_URL: process.env.DATABASE_URL
})
