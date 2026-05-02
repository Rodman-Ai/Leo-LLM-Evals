import { defineSuite, exact } from '@/lib/eval'

export default defineSuite({
	name: 'toy',
	description: 'Smoke test — 5 trivially-answerable cases for the exact scorer',
	tags: ['smoke'],
	models: ['anthropic:claude-haiku-4-5', 'mock:smart', 'mock:medium', 'mock:weak'],
	prompt: ({ input }) =>
		`Answer with a single lowercase word and nothing else. No punctuation, no quotes, no explanation.\n\nQuestion: ${input}`,
	concurrency: 5,
	cases: [
		{
			input: 'What color is the sky on a clear day?',
			expected: 'blue',
			scorers: [exact({ ignoreCase: true })],
		},
		{
			input: 'How many legs does a spider have? Answer as a written-out number.',
			expected: 'eight',
			scorers: [exact({ ignoreCase: true })],
		},
		{
			input: 'What is the opposite of hot?',
			expected: 'cold',
			scorers: [exact({ ignoreCase: true })],
		},
		{
			input: 'Capital of France?',
			expected: 'paris',
			scorers: [exact({ ignoreCase: true })],
		},
		{
			input: 'What animal says "meow"?',
			expected: 'cat',
			scorers: [exact({ ignoreCase: true })],
		},
	],
})
