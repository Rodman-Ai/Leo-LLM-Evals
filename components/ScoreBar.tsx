import { passColorClass } from '@/lib/format'

export function ScoreBar({ value }: { value: number }) {
	const clamped = Math.max(0, Math.min(1, value))
	const pct = Math.round(clamped * 100)
	return (
		<div className='flex items-center gap-2'>
			<div className='h-1.5 w-24 overflow-hidden rounded-full bg-muted'>
				<div
					className={`h-full ${passColorClass(clamped)}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className='text-xs tabular-nums text-muted-foreground'>{pct}%</span>
		</div>
	)
}
