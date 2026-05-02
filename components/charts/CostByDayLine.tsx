'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type CostPoint = { day: string; costCents: number }

export function CostByDayLine({ data }: { data: CostPoint[] }) {
	if (data.length === 0) {
		return (
			<div className='flex h-64 items-center justify-center text-sm text-muted-foreground'>
				No completed runs yet.
			</div>
		)
	}
	return (
		<div className='h-64 w-full'>
			<ResponsiveContainer width='100%' height='100%'>
				<AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
					<defs>
						<linearGradient id='costFill' x1='0' x2='0' y1='0' y2='1'>
							<stop offset='0%' stopColor='#6366f1' stopOpacity={0.3} />
							<stop offset='100%' stopColor='#6366f1' stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid stroke='hsl(var(--border))' vertical={false} />
					<XAxis
						dataKey='day'
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						axisLine={false}
						tickLine={false}
						minTickGap={32}
					/>
					<YAxis
						tickFormatter={(v) => `$${(v / 100).toFixed(2)}`}
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						axisLine={false}
						tickLine={false}
						width={56}
					/>
					<Tooltip
						contentStyle={{
							background: 'hsl(var(--card))',
							border: '1px solid hsl(var(--border))',
							borderRadius: 6,
							fontSize: 12,
						}}
						formatter={(value) => {
							if (typeof value !== 'number') return [value as string, 'Cost']
							return [`$${(value / 100).toFixed(4)}`, 'Cost']
						}}
					/>
					<Area
						type='monotone'
						dataKey='costCents'
						stroke='#6366f1'
						strokeWidth={2}
						fill='url(#costFill)'
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	)
}
