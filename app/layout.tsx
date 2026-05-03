import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'evalbench · code-defined LLM evals with a real comparison dashboard',
	description:
		'Define test cases in TypeScript, run them across Claude / GPT / Gemini, score with deterministic + LLM-as-judge, and track regressions on every PR. Like pytest for prompts, with a dashboard on top.',
	icons: {
		icon: [
			{ url: '/favicon.svg', type: 'image/svg+xml' },
		],
	},
	openGraph: {
		title: 'evalbench',
		description: 'Code-defined LLM evals with a real comparison dashboard.',
		type: 'website',
	},
}

// Inline script to apply the saved theme before first paint to prevent flash.
const themeBootstrap = `
(function() {
	try {
		var stored = localStorage.getItem('evalbench:theme');
		if (stored === 'light') document.documentElement.classList.add('light');
		else if (stored === 'dark') document.documentElement.classList.add('dark');
	} catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
			</head>
			<body className='min-h-screen antialiased'>{children}</body>
		</html>
	)
}
