import z from 'zod'

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().trim().min(1),

	NOTIFY_BEFORE_MINUTES: z.coerce.number().int().positive().default(10),

	CRON_SECRET: z.string().trim().min(32).optional()
})

export const env = serverEnvSchema.parse({
	DATABASE_URL: process.env.DATABASE_URL,
	NOTIFY_BEFORE_MINUTES: process.env.NOTIFY_BEFORE_MINUTES,
	CRON_SECRET: process.env.CRON_SECRET
})
