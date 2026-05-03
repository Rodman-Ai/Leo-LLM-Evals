import type { SuiteDefinitionInput } from './schema'

export const SUITE_TEMPLATE_FILENAME = 'evalbench-suite-template.json'

export const SUITE_TEMPLATE: SuiteDefinitionInput = {
	name: 'my-suite',
	description: 'Short description shown on the suite page and the leaderboard.',
	tags: ['example', 'classification'],
	cases: [
		{
			input: 'What is the capital of France?',
			expected: 'paris',
			tags: ['geography', 'easy'],
			metadata: { difficulty: 1 },
		},
		{
			input: 'Translate "hello" to Spanish.',
			expected: 'hola',
			tags: ['translation'],
		},
		{
			input: 'Summarize the following in one sentence:\n\n…paste your input here…',
			tags: ['summarization', 'open-ended'],
		},
	],
}

export function buildSuiteTemplate(): string {
	return JSON.stringify(SUITE_TEMPLATE, null, 2) + '\n'
}
