import { describe, expect, it } from 'vitest'
import { registerSchema } from './schemas'

const validInput = {
	name: 'Олена',
	email: 'olena@example.com',
	password: 'StrongPass123$'
}

describe('registerSchema', () => {
	it('normalizes name and email', () => {
		const result = registerSchema.parse({
			...validInput,
			name: '  Олена  ',
			email: '  OLENA@EXAMPLE.COM  '
		})

		expect(result.name).toBe('Олена')
		expect(result.email).toBe('olena@example.com')
	})

	it('rejects a whitespace-only name', () => {
		const result = registerSchema.safeParse({
			...validInput,
			name: '   '
		})

		expect(result.success).toBe(false)
	})

	it.each([7, 73])('rejects a password containing %i characters', length => {
		const result = registerSchema.safeParse({
			...validInput,
			password: 'a'.repeat(length)
		})

		expect(result.success).toBe(false)
	})

	it.each([8, 72])('accepts a password containing %i characters', length => {
		const result = registerSchema.safeParse({
			...validInput,
			password: 'a'.repeat(length)
		})

		expect(result.success).toBe(true)
	})

	it('rejects an invalid email', () => {
		const result = registerSchema.safeParse({
			...validInput,
			email: 'not-an-email'
		})

		expect(result.success).toBe(false)
	})
})
