import { Providers } from '@/app/providers'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'Meetly',
	description: 'Бронювання кімнат для зустрічей'
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="uk">
			<body className="min-h-screen bg-zinc-50 text-zinc-950">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
