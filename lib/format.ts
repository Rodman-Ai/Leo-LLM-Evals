export function formatCost(cents: number): string {
	return `$${(cents / 100).toFixed(4)}`
}

export function formatLatency(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	return `${(ms / 1000).toFixed(2)}s`
}

export function formatDate(d: Date | string | null | undefined): string {
	if (!d) return '—'
	const date = typeof d === 'string' ? new Date(d) : d
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function passColorClass(passRate: number): string {
	if (passRate >= 0.85) return 'bg-green-500'
	if (passRate >= 0.7) return 'bg-yellow-500'
	return 'bg-red-500'
}

export function passTextClass(passRate: number): string {
	if (passRate >= 0.85) return 'text-green-600 dark:text-green-400'
	if (passRate >= 0.7) return 'text-yellow-600 dark:text-yellow-400'
	return 'text-red-600 dark:text-red-400'
}
