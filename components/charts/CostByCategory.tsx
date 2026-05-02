'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type CategoryDatum = { label: string; costCents: number; runs: number }

const PROVIDER_COLOR: Record<string, string> = {
	anthropic: '#f97316',
	openai: '#10b981',
	google: '#3b82f6',
	mock: '#94a3b8',
}

function colorFor(label: string): string {
	const provider = label.split(':')[0]
	return PROVIDER_COLOR[provider] ?? '#6366f1'
}

function shorten(label: string): string {
	if (!label.includes(':')) return label
	const [, name = label] = label.split(':')
	return name
}

export function CostByCategory({ data }: { data: CategoryDatum[] }) {
	if (data.length === 0) {
		return (
			<div className='flex h-64 items-center justify-center text-sm text-muted-foreground'>
				No data yet.
			</div>
		)
	}
	return (
		<div className='h-64 w-full'>
			<ResponsiveContainer width='100%' height='100%'>
				<BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} layout='vertical'>
					<CartesianGrid stroke='hsl(var(--border))' horizontal={false} />
					<XAxis
						type='number'
						tickFormatter={(v) => `$${(v / 100).toFixed(2)}`}
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						type='category'
						dataKey='label'
						tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
						tickFormatter={shorten}
						axisLine={false}
						tickLine={false}
						width={120}
					/>
					<Tooltip
						cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
						contentStyle={{
							background: 'hsl(var(--card))',
							border: '1px solid hsl(var(--border))',
							borderRadius: 6,
							fontSize: 12,
						}}
						formatter={(value, _name, item) => {
							const d = item?.payload as CategoryDatum | undefined
							if (typeof value !== 'number' || !d) return [value as string, '']
							return [`$${(value / 100).toFixed(4)} · ${d.runs} runs`, 'Cost']
						}}
					/>
					<Bar dataKey='costCents' radius={[0, 4, 4, 0]}>
						{data.map((d) => (
							<Cell key={d.label} fill={colorFor(d.label)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
