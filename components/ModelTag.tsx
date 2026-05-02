const providerColors: Record<string, string> = {
	anthropic: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/30',
	openai: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
	google: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30',
}

export function ModelTag({ model }: { model: string }) {
	const [provider, ...rest] = model.split(':')
	const palette = providerColors[provider] ?? 'bg-muted text-muted-foreground ring-border'
	return (
		<span
			className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono ring-1 ring-inset ${palette}`}
		>
			<span className='font-semibold'>{provider}</span>
			<span className='opacity-70'>{rest.join(':') || '—'}</span>
		</span>
	)
}
