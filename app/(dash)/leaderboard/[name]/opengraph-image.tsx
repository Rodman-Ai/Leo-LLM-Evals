import { ImageResponse } from 'next/og'
import { getLeaderboard } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'evalbench leaderboard'

const PROVIDER_COLOR: Record<string, string> = {
	anthropic: '#f97316',
	openai: '#10b981',
	google: '#3b82f6',
	mock: '#94a3b8',
}

function colorFor(model: string): string {
	const provider = model.split(':')[0]
	return PROVIDER_COLOR[provider] ?? '#6366f1'
}

function shorten(model: string): string {
	const [, name = model] = model.split(':')
	return name
}

export default async function Image({ params }: { params: { name: string } }) {
	const decoded = decodeURIComponent(params.name)

	let entries: Awaited<ReturnType<typeof getLeaderboard>>['entries'] = []
	let suiteName = decoded
	try {
		const data = await getLeaderboard(decoded)
		if (data.suite) {
			suiteName = data.suite.name
			entries = data.entries.slice(0, 5)
		}
	} catch {
		// fall through to empty card
	}

	const top = entries[0]
	const topRate = top && top.total ? top.passed / top.total : 0

	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '60px 64px',
					background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
					color: '#f8fafc',
					fontFamily: 'system-ui, sans-serif',
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, color: '#94a3b8' }}>
						<span>evalbench</span>
						<span>·</span>
						<span>leaderboard</span>
					</div>
					<div style={{ marginTop: 12, fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>
						{suiteName}
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
					{entries.length === 0 ? (
						<div style={{ fontSize: 28, color: '#94a3b8' }}>No completed runs yet.</div>
					) : (
						entries.map((e, i) => {
							const rate = e.total ? e.passed / e.total : 0
							return (
								<div
									key={e.model}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 18,
										fontSize: 24,
									}}
								>
									<div
										style={{
											display: 'flex',
											width: 44,
											fontVariantNumeric: 'tabular-nums',
											color: '#94a3b8',
										}}
									>
										{i + 1}.
									</div>
									<div
										style={{
											display: 'flex',
											width: 380,
											fontWeight: 600,
											color: colorFor(e.model),
										}}
									>
										{shorten(e.model)}
									</div>
									<div
										style={{
											display: 'flex',
											flex: 1,
											height: 14,
											background: '#1e293b',
											borderRadius: 7,
											overflow: 'hidden',
										}}
									>
										<div
											style={{
												display: 'flex',
												width: `${Math.round(rate * 100)}%`,
												background: colorFor(e.model),
											}}
										/>
									</div>
									<div
										style={{
											display: 'flex',
											width: 120,
											justifyContent: 'flex-end',
											fontVariantNumeric: 'tabular-nums',
										}}
									>
										{Math.round(rate * 100)}%
									</div>
								</div>
							)
						})
					)}
				</div>

				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						fontSize: 20,
						color: '#94a3b8',
					}}
				>
					<div>Code-defined LLM evals</div>
					{top && (
						<div>
							winner: <span style={{ color: '#f8fafc' }}>{shorten(top.model)}</span> at{' '}
							{Math.round(topRate * 100)}%
						</div>
					)}
				</div>
			</div>
		),
		{ ...size },
	)
}
