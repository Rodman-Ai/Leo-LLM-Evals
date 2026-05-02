import toySuite from '@/tests/toy.eval'
import codeReviewSuite from '@/tests/code-review.eval'
import { runSuite } from '.'
import type { SuiteDef } from './suite'

const SUITES: SuiteDef[] = [toySuite, codeReviewSuite]

/**
 * Maps real-looking model IDs (shown in the leaderboard) to mock tier IDs
 * (which actually execute). The mock provider returns deterministic synthetic
 * outputs at the listed accuracy.
 *
 * The PUBLIC_DEMO_MODE banner makes clear that nothing real ran — these names
 * exist so the leaderboard reads like a recognizable head-to-head.
 */
const DEMO_MODELS: { display: string; tier: string }[] = [
	{ display: 'anthropic:claude-opus-4-7', tier: 'mock:smart' },
	{ display: 'openai:gpt-5', tier: 'mock:smart' },
	{ display: 'anthropic:claude-haiku-4-5', tier: 'mock:medium' },
	{ display: 'google:gemini-2.5-pro', tier: 'mock:medium' },
	{ display: 'openai:gpt-4o-mini', tier: 'mock:weak' },
	{ display: 'google:gemini-1.5-flash', tier: 'mock:weak' },
]

export type DemoSeedSummary = {
	suite: string
	model: string
	runId: number | null
	passed: number
	total: number
}

export async function demoSeedAll(opts: { triggeredBy?: string } = {}): Promise<DemoSeedSummary[]> {
	const summaries: DemoSeedSummary[] = []
	const displayedModels = DEMO_MODELS.map((d) => d.display)

	for (const suite of SUITES) {
		const seedSuite: SuiteDef = { ...suite, models: displayedModels }
		for (const { display, tier } of DEMO_MODELS) {
			const summary = await runSuite({
				suite: seedSuite,
				model: display,
				executeAs: tier,
				persist: true,
				triggeredBy: opts.triggeredBy ?? 'seed',
			})
			summaries.push({
				suite: suite.name,
				model: display,
				runId: summary.runId,
				passed: summary.passed,
				total: summary.total,
			})
		}
	}

	return summaries
}
