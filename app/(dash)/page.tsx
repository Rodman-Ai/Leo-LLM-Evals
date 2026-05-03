import Link from 'next/link'
import { LogoLarge } from '@/components/Logo'
import { getLandingStats, listSuites, listRuns } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'evalbench · code-defined LLM evals with a real comparison dashboard',
	description:
		'Define eval test cases in TypeScript, run them across Claude / GPT / Gemini, score with deterministic + LLM-as-judge, track regressions on every PR. Like pytest for prompts, with a dashboard on top.',
}

export default async function HomePage() {
	let stats: Awaited<ReturnType<typeof getLandingStats>> = {
		totalRuns: 0,
		totalCases: 0,
		uniqueModels: 0,
		totalCostCents: 0,
		suiteCount: 0,
	}
	let firstSuite: string | null = null
	let recentRunCount = 0
	let dbReachable = false
	try {
		stats = await getLandingStats()
		const suites = await listSuites()
		firstSuite = suites[0]?.name ?? null
		const recent = await listRuns({ limit: 1 })
		recentRunCount = recent.length
		dbReachable = true
	} catch {
		// fall through to empty hero
	}

	return (
		<div className='-mx-6 -my-8'>
			<HeroSection
				dbReachable={dbReachable}
				stats={stats}
				firstSuite={firstSuite}
				recentRunCount={recentRunCount}
			/>
			<FeaturesSection />
			<HowItWorksSection />
			<FinalCtaSection firstSuite={firstSuite} />
		</div>
	)
}

function HeroSection({
	dbReachable,
	stats,
	firstSuite,
	recentRunCount,
}: {
	dbReachable: boolean
	stats: Awaited<ReturnType<typeof getLandingStats>>
	firstSuite: string | null
	recentRunCount: number
}) {
	return (
		<section className='border-b border-border bg-gradient-to-b from-muted/20 to-background px-6 py-20'>
			<div className='mx-auto max-w-5xl'>
				<div className='flex items-center'>
					<LogoLarge />
				</div>
				<h1 className='mt-8 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl'>
					Code-defined LLM evals with a real comparison dashboard.
				</h1>
				<p className='mt-5 max-w-2xl text-lg text-muted-foreground'>
					Write test cases in TypeScript. Run them across Claude, GPT, and Gemini. Score with
					deterministic checkers or an LLM judge. Track regressions on every PR. Free to
					self-host on Vercel + Neon.
				</p>
				<div className='mt-8 flex flex-wrap items-center gap-3'>
					{firstSuite ? (
						<Link
							href={`/leaderboard/${encodeURIComponent(firstSuite)}`}
							className='inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90'
						>
							View live leaderboard
							<ArrowRight />
						</Link>
					) : (
						<Link
							href='/suites'
							className='inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90'
						>
							Browse suites
							<ArrowRight />
						</Link>
					)}
					<Link
						href='/api-docs'
						className='inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted'
					>
						API reference
					</Link>
					<a
						href='https://github.com/Rodman-Ai/Leo-LLM-Evals'
						target='_blank'
						rel='noopener'
						className='inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted'
					>
						<GithubGlyph />
						GitHub
					</a>
				</div>

				{dbReachable && stats.totalRuns > 0 && (
					<dl className='mt-12 grid grid-cols-2 gap-6 border-t border-border pt-8 sm:grid-cols-4'>
						<Stat label='Runs completed' value={stats.totalRuns.toLocaleString()} />
						<Stat label='Cases scored' value={stats.totalCases.toLocaleString()} />
						<Stat label='Models compared' value={stats.uniqueModels.toLocaleString()} />
						<Stat label='Suites' value={stats.suiteCount.toLocaleString()} />
					</dl>
				)}

				{!dbReachable && (
					<p className='mt-12 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300'>
						Database not connected — set <code>DATABASE_URL</code> on this deployment to
						enable suites, runs, and the leaderboard.
					</p>
				)}

				{dbReachable && recentRunCount === 0 && (
					<p className='mt-12 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground'>
						No runs yet. Hit{' '}
						<code className='rounded bg-background px-1.5 py-0.5'>/api/seed?token=…</code> to
						populate this dashboard with synthetic data — see{' '}
						<a
							className='underline'
							href='https://github.com/Rodman-Ai/Leo-LLM-Evals/blob/main/docs/demo-mode.md'
							target='_blank'
							rel='noopener'
						>
							demo mode docs
						</a>
						.
					</p>
				)}
			</div>
		</section>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</dt>
			<dd className='mt-1 text-2xl font-semibold tabular-nums'>{value}</dd>
		</div>
	)
}

function FeaturesSection() {
	return (
		<section className='px-6 py-20'>
			<div className='mx-auto max-w-5xl'>
				<h2 className='text-2xl font-semibold tracking-tight'>What&apos;s shipped</h2>
				<p className='mt-2 max-w-2xl text-muted-foreground'>
					Every feature below is live in this build. Click any card to jump to it.
				</p>
				<div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
					<FeatureCard
						icon={<CodeIcon />}
						title='Code-first test suites'
						body='Define cases in *.eval.ts files. Type-safe, reviewable in PRs, no YAML drift.'
						href='/suites'
					/>
					<FeatureCard
						icon={<ChartIcon />}
						title='Real comparison dashboard'
						body='Side-by-side run diff, leaderboard bars, per-suite timelines, cost breakdowns. Recharts + RSC.'
						href='/runs'
					/>
					<FeatureCard
						icon={<DollarIcon />}
						title='Cost dashboard'
						body='Daily spend, by-model, by-suite, top runs. Backfill demo costs in one SQL statement.'
						href='/costs'
					/>
					<FeatureCard
						icon={<HookIcon />}
						title='Outgoing webhooks'
						body='HMAC-signed run.completed + regression.detected payloads. Test deliveries from the UI.'
						href='/webhooks'
					/>
					<FeatureCard
						icon={<PlugIcon />}
						title='Public API + Swagger'
						body='Five GET endpoints + four webhook config endpoints. Interactive try-it-out at /api-docs.'
						href='/api-docs'
					/>
					<FeatureCard
						icon={<DownloadIcon />}
						title='Sheets + OneDrive export'
						body='OAuth to Google or Microsoft. CSV download works without any account at all.'
						href='/connections'
					/>
				</div>
			</div>
		</section>
	)
}

function FeatureCard({
	icon,
	title,
	body,
	href,
}: {
	icon: React.ReactNode
	title: string
	body: string
	href: string
}) {
	return (
		<Link
			href={href}
			className='group block rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md'
		>
			<div className='flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand'>
				{icon}
			</div>
			<h3 className='mt-4 font-semibold'>{title}</h3>
			<p className='mt-1.5 text-sm text-muted-foreground'>{body}</p>
			<span className='mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground'>
				Open <ArrowRight size={10} />
			</span>
		</Link>
	)
}

function HowItWorksSection() {
	return (
		<section className='border-t border-border bg-muted/20 px-6 py-20'>
			<div className='mx-auto max-w-5xl'>
				<h2 className='text-2xl font-semibold tracking-tight'>How it fits together</h2>
				<p className='mt-2 max-w-2xl text-muted-foreground'>
					Three entry points run the same eval pipeline; the dashboard reads the same Postgres
					tables they write to.
				</p>
				<div className='mt-8 grid gap-6 lg:grid-cols-3'>
					<StepCard
						step='1'
						title='Define'
						body={
							<>
								Write a suite at{' '}
								<code className='rounded bg-background px-1.5'>tests/foo.eval.ts</code>: name,
								models, prompt, cases, scorers.
							</>
						}
					/>
					<StepCard
						step='2'
						title='Run'
						body={
							<>
								<code className='rounded bg-background px-1.5'>pnpm eval</code> locally, hit{' '}
								<code className='rounded bg-background px-1.5'>POST /api/seed</code> in the
								browser, or open a PR — same runner, same results.
							</>
						}
					/>
					<StepCard
						step='3'
						title='Compare'
						body='Browse runs, drill into a leaderboard, side-by-side diff two runs, export to Sheets or OneDrive, or wire a webhook to Slack.'
					/>
				</div>
			</div>
		</section>
	)
}

function StepCard({ step, title, body }: { step: string; title: string; body: React.ReactNode }) {
	return (
		<div className='rounded-xl border border-border bg-card p-6'>
			<div className='inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-semibold text-[hsl(var(--brand-foreground))]'>
				{step}
			</div>
			<h3 className='mt-4 font-semibold'>{title}</h3>
			<p className='mt-2 text-sm text-muted-foreground'>{body}</p>
		</div>
	)
}

function FinalCtaSection({ firstSuite }: { firstSuite: string | null }) {
	return (
		<section className='border-t border-border px-6 py-20'>
			<div className='mx-auto max-w-3xl text-center'>
				<h2 className='text-3xl font-semibold tracking-tight'>Try the demo</h2>
				<p className='mt-3 text-muted-foreground'>
					Everything in this build is live. The data is synthetic, generated by a deterministic{' '}
					<code className='rounded bg-muted px-1.5'>mock:*</code> provider — no real model
					calls happened. Open the leaderboard or browse the runs.
				</p>
				<div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
					<Link
						href={firstSuite ? `/leaderboard/${encodeURIComponent(firstSuite)}` : '/suites'}
						className='inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-[hsl(var(--brand-foreground))] shadow-sm hover:opacity-90'
					>
						{firstSuite ? `Open the ${firstSuite} leaderboard` : 'Browse suites'}
						<ArrowRight />
					</Link>
					<Link
						href='/runs'
						className='inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted'
					>
						Recent runs
					</Link>
				</div>
			</div>
		</section>
	)
}

function ArrowRight({ size = 12 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox='0 0 12 12' fill='none' aria-hidden='true'>
			<path
				d='M2 6h8m0 0L7 3m3 3L7 9'
				stroke='currentColor'
				strokeWidth='1.6'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	)
}

function GithubGlyph() {
	return (
		<svg width='14' height='14' viewBox='0 0 16 16' fill='currentColor' aria-hidden='true'>
			<path
				fillRule='evenodd'
				d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z'
			/>
		</svg>
	)
}

function CodeIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M5 4L1 8l4 4M11 4l4 4-4 4M9 2L7 14' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
		</svg>
	)
}
function ChartIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M2 14h12M4 11V7m4 4V4m4 7v-2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
		</svg>
	)
}
function DollarIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M8 1v14M11 4H6.5a2 2 0 000 4h3a2 2 0 010 4H5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
		</svg>
	)
}
function HookIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M8 2v6m0 0a3 3 0 100 6h2a3 3 0 003-3' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
			<circle cx='8' cy='8' r='1.2' fill='currentColor' />
		</svg>
	)
}
function PlugIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M5 5V2m6 3V2M5 5h6v3a3 3 0 11-6 0V5zM8 11v3' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
		</svg>
	)
}
function DownloadIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M8 2v8m-3-3l3 3 3-3M2 14h12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
		</svg>
	)
}
