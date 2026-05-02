import { formatCost } from '@/lib/format'

export function CostCell({ cents }: { cents: number }) {
	return <span className='tabular-nums'>{formatCost(cents)}</span>
}
