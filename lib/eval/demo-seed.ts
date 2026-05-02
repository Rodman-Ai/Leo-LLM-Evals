import toySuite from '@/tests/toy.eval'
import codeReviewSuite from '@/tests/code-review.eval'
import { runSuite, listMockModels } from '.'
import type { SuiteDef } from './suite'

const SUITES: SuiteDef[] = [toySuite, codeReviewSuite]

export type DemoSeedSummary = {
	suite: string
	model: string
	runId: number | null
	passed: number
	total: number
}

export async function demoSeedAll(opts: { triggeredBy?: string } = {}): Promise<DemoSeedSummary[]> {
	const models = listMockModels()
	const summaries: DemoSeedSummary[] = []

	for (const suite of SUITES) {
		const seedSuite: SuiteDef = { ...suite, models }
		for (const model of models) {
			const summary = await runSuite({
				suite: seedSuite,
				model,
				persist: true,
				triggeredBy: opts.triggeredBy ?? 'seed',
			})
			summaries.push({
				suite: suite.name,
				model,
				runId: summary.runId,
				passed: summary.passed,
				total: summary.total,
			})
		}
	}

	return summaries
}
