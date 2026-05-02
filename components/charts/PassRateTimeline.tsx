'use client'

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	Legend,
} from 'recharts'

export type TimelinePoint = {
	startedAt: string
	[modelKey: string]: string | number | null
}

const PROVIDER_COLOR: Record<string, string> = {
	anthropic: '#f97316',
	openai: '#10b981',
	google: '#3b82f6',
	mock: '#94a3b8',
}

function colorFor(model: string): string {
	const provider = model.split(':')[0]
	return PROVIDER_COLOR[provider] ?? '#64748b'
}

function shortenLabel(model: string): string {
	const [, name = model] = model.split(':')
	return name
}

export function PassRateTimeline({
	data,
	models,
}: {
	data: TimelinePoint[]
	models: string[]
}) {
	if (data.length === 0 || models.length === 0) {
		return (
			<div className='flex h-72 items-center justify-center text-sm text-muted-foreground'>
				Not enough data for a timeline yet — run the suite a few more times.
			</div>
		)
	}
	return (
		<div className='h-72 w-full'>
			<ResponsiveContainer width='100%' height='100%'>
				<LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
					<CartesianGrid stroke='hsl(var(--border))' vertical={false} />
					<XAxis
						dataKey='startedAt'
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						axisLine={false}
						tickLine={false}
						minTickGap={32}
					/>
					<YAxis
						domain={[0, 1]}
						tickFormatter={(v) => `${Math.round(v * 100)}%`}
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						axisLine={false}
						tickLine={false}
						width={40}
					/>
					<Tooltip
						contentStyle={{
							background: 'hsl(var(--card))',
							border: '1px solid hsl(var(--border))',
							borderRadius: 6,
							fontSize: 12,
						}}
						labelStyle={{ color: 'hsl(var(--foreground))' }}
						formatter={(value, name) => {
							if (typeof value !== 'number') return [value as string, name as string]
							return [`${Math.round(value * 100)}%`, shortenLabel(name as string)]
						}}
					/>
					<Legend
						wrapperStyle={{ fontSize: 11 }}
						formatter={(name) => shortenLabel(name as string)}
					/>
					{models.map((m) => (
						<Line
							key={m}
							type='monotone'
							dataKey={m}
							stroke={colorFor(m)}
							strokeWidth={2}
							dot={{ r: 3 }}
							connectNulls
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}
