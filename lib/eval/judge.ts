import { z } from 'zod'
import type { Scorer } from './scorer'
import { generateStructured } from './provider'
import { costCents } from './pricing'

const JudgeSchema = z.object({
	score: z.number().min(0).max(1),
	reasoning: z.string().min(1),
})

export type LlmJudgeOptions = {
	/** Plain-language criteria the judge applies. Stays in the prompt verbatim. */
	rubric: string
	/** Model id (e.g. `anthropic:claude-haiku-4-5`) used to do the scoring. Prefer cheap models. */
	model: string
	/** Pass cutoff applied to the judge's 0–1 score. Default 0.7. */
	threshold?: number
}

/**
 * LLM-as-judge scorer. Sends the case input + expected + output to a
 * model with a structured-output schema (`{ score, reasoning }`) and
 * compares the score to a threshold. Cost is captured per invocation.
 *
 * Caveats: single-judge scores are biased — for important leaderboards,
 * prefer multi-judge consensus (Sprint 5 on the roadmap).
 *
 * ```ts
 * llmJudge({
 *   rubric: 'Does the answer correctly identify the bug in the diff?',
 *   model: 'anthropic:claude-haiku-4-5',
 *   threshold: 0.8,
 * })
 * ```
 */
export function llmJudge(opts: LlmJudgeOptions): Scorer {
	const { rubric, model, threshold = 0.7 } = opts
	if (!rubric) throw new Error('llmJudge: rubric is required')
	if (!model) throw new Error('llmJudge: model is required')

	return {
		name: 'llmJudge',
		async score({ input, expected, output }) {
			const prompt = buildPrompt({ rubric, input, expected, output })
			const res = await generateStructured(model, prompt, JudgeSchema)
			const score = clamp01(res.object.score)
			const judgeCost = costCents(model, res.inputTokens, res.outputTokens)
			return {
				value: score,
				passed: score >= threshold,
				reason: res.object.reasoning,
				costCents: judgeCost,
				judgeModel: model,
			}
		},
	}
}

function buildPrompt(args: {
	rubric: string
	input: string
	expected: string | undefined
	output: string
}): string {
	const expectedSection = args.expected
		? `\n\nReference answer (for comparison; the candidate need not match it verbatim):\n${args.expected}`
		: ''
	return `You are an impartial judge. Score the candidate answer against the rubric.

Rubric:
${args.rubric}

Original prompt / question:
${args.input}${expectedSection}

Candidate answer:
${args.output}

Return a score from 0.0 (completely fails the rubric) to 1.0 (perfectly satisfies it), and a one-sentence reasoning. Be calibrated and strict.`
}

function clamp01(n: number): number {
	if (Number.isNaN(n)) return 0
	return Math.max(0, Math.min(1, n))
}
