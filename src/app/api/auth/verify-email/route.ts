import {
	createAuthUrl,
	verifyEmailToken
} from '@/server/auth/email-verification'

export async function GET(request: Request) {
	const token = new URL(request.url).searchParams.get('token')
	const resultUrl = createAuthUrl('/verify-email/result', request.url)

	if (!token) {
		resultUrl.searchParams.set('status', 'invalid')
		return Response.redirect(resultUrl, 302)
	}

	try {
		const result = await verifyEmailToken(token)

		if (result.ok) {
			resultUrl.searchParams.set('status', 'success')
		} else {
			resultUrl.searchParams.set('status', result.reason)

			if (result.reason === 'expired') {
				resultUrl.searchParams.set('email', result.email)
			}
		}

		return Response.redirect(resultUrl, 302)
	} catch {
		resultUrl.searchParams.set('status', 'error')
		return Response.redirect(resultUrl, 302)
	}
}
