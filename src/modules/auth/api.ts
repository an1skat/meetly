export type AuthFieldErrors = Record<string, string[] | undefined>

type AuthErrorResponse = {
	message?: string
	fieldErrors?: AuthFieldErrors
}

export class AuthRequestError extends Error {
	constructor(
		message: string,
		readonly fieldErrors?: AuthFieldErrors
	) {
		super(message)
		this.name = 'AuthRequestError'
	}
}

export async function postAuth<TResponse>(
	url: string,
	body?: unknown
): Promise<TResponse> {
	const hasBody = body !== undefined
	const response = await fetch(url, {
		method: 'POST',
		headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
		body: hasBody ? JSON.stringify(body) : undefined
	})
	const payload: unknown =
		response.status === 204
			? null
			: await response.json().catch(() => null)

	if (!response.ok) {
		const error = payload as AuthErrorResponse | null

		throw new AuthRequestError(
			error?.message ?? 'Не вдалося виконати запит',
			error?.fieldErrors
		)
	}

	return payload as TResponse
}
