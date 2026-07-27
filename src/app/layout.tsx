import { Navigation } from '@/components/navigation'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin']
})

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
		<html
			lang="uk"
			className={`${geistSans.variable} ${geistMono.variable}`}
		>
			<body className="min-h-screen bg-zinc-50 text-zinc-950">
				<div className="flex min-h-screen flex-col">
					<Navigation />

					<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
						{children}
					</main>
				</div>
			</body>
		</html>
	)
}
