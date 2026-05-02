'use client'

import { useState } from 'react'

export function EmbedSnippet({ suite }: { suite: string }) {
	const [copied, setCopied] = useState(false)
	const [origin, setOrigin] = useState<string | null>(null)

	if (origin === null && typeof window !== 'undefined') {
		setOrigin(window.location.origin)
	}

	const url = `${origin ?? '<your-host>'}/embed/leaderboard/${encodeURIComponent(suite)}`
	const snippet = `<iframe src="${url}" width="100%" height="500" frameborder="0" loading="lazy"></iframe>`

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(snippet)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {
			// no-op; some browsers block clipboard
		}
	}

	return (
		<details className='rounded-lg border border-border bg-muted/30 p-4 text-xs'>
			<summary className='cursor-pointer text-sm font-medium'>Embed this leaderboard</summary>
			<p className='mt-2 text-muted-foreground'>
				Paste this snippet into a blog post or markdown file that supports HTML.
			</p>
			<pre className='mt-3 overflow-x-auto rounded border border-border bg-card p-3 font-mono text-[11px]'>
				{snippet}
			</pre>
			<button
				type='button'
				onClick={copy}
				className='mt-2 rounded border border-border bg-card px-3 py-1.5 font-medium hover:bg-muted'
			>
				{copied ? 'Copied' : 'Copy snippet'}
			</button>
		</details>
	)
}
