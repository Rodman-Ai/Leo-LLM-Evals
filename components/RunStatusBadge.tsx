type Status = 'running' | 'complete' | 'error'

const palette: Record<Status, string> = {
	running: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30',
	complete: 'bg-green-500/10 text-green-700 dark:text-green-300 ring-green-500/30',
	error: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/30',
}

export function RunStatusBadge({ status }: { status: Status }) {
	return (
		<span
			className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${palette[status]}`}
		>
			{status}
		</span>
	)
}
