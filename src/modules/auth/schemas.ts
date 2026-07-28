import z from 'zod'

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Вкажіть ім’я' })
    .max(100, { error: 'Ім’я не може бути довшим за 100 символів' }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z
        .email({ error: 'Вкажіть коректний email' })
        .max(320, { error: 'Email не може бути довшим за 320 символів' })
    ),

  password: z
    .string()
    .min(8, { error: 'Пароль має містити щонайменше 8 символів' })
    .max(72, { error: 'Пароль не може бути довшим за 72 символи' })
})

export type RegisterInput = z.infer<typeof registerSchema>