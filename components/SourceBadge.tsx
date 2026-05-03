import type { ResultSource } from '@/lib/db/schema'

const SOURCE_INFO: Record<ResultSource, { letter: string; label: string; classes: string }> = {
	app: {
		letter: 'A',
		label: 'App-generated (runSuite)',
		classes:
			'bg-muted text-muted-foreground ring-border',
	},
	import: {
		letter: 'I',
		label: 'Imported via CSV',
		classes:
			'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30',
	},
}

export function SourceBadge({ source }: { source: ResultSource }) {
	const info = SOURCE_INFO[source]
	return (
		<span
			title={info.label}
			className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ring-1 ring-inset ${info.classes}`}
		>
			{info.letter}
		</span>
	)
}

export function ImportedChip() {
	return (
		<span className='inline-flex items-center gap-1.5 rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-500/30 dark:text-blue-300'>
			<svg width='10' height='10' viewBox='0 0 10 10' fill='none' aria-hidden='true'>
				<path
					d='M5 1v6m-2-2l2 2 2-2M2 9h6'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</svg>
			Imported
		</span>
	)
}
