'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type BarDatum = {
	model: string
	rate: number
	passed: number
	total: number
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

export function PassRateBars({ data }: { data: BarDatum[] }) {
	const sorted = [...data].sort((a, b) => b.rate - a.rate)
	return (
		<div className='h-72 w-full'>
			<ResponsiveContainer width='100%' height='100%'>
				<BarChart data={sorted} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} barCategoryGap={20}>
					<CartesianGrid stroke='hsl(var(--border))' vertical={false} />
					<XAxis
						dataKey='model'
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						tickFormatter={shortenLabel}
						axisLine={false}
						tickLine={false}
						interval={0}
						angle={-15}
						textAnchor='end'
						height={50}
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
						cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
						contentStyle={{
							background: 'hsl(var(--card))',
							border: '1px solid hsl(var(--border))',
							borderRadius: 6,
							fontSize: 12,
						}}
						labelStyle={{ color: 'hsl(var(--foreground))' }}
						formatter={(_value, _name, item) => {
							const d = item?.payload as BarDatum | undefined
							if (!d) return null
							return [`${Math.round(d.rate * 100)}% (${d.passed}/${d.total})`, 'Pass rate']
						}}
					/>
					<Bar dataKey='rate' radius={[4, 4, 0, 0]}>
						{sorted.map((d) => (
							<Cell key={d.model} fill={colorFor(d.model)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
