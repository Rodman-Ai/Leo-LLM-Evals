import { z } from 'zod'

/**
 * Schema for the suite-import JSON file. Mirrors the SuiteDef from
 * `lib/eval/suite.ts` minus the runtime-only fields (`prompt`, `models`,
 * scorer instances). What you import here is just the case inventory + the
 * suite metadata; running the suite later is a separate concern.
 */
export const SuiteCaseSchema = z.object({
	input: z.string().min(1),
	expected: z.string().nullable().optional(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()).optional(),
})

export const SuiteDefinitionSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(120)
		.regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'name must start alphanumeric and contain only [a-zA-Z0-9._-]'),
	description: z.string().max(2_000).nullable().optional(),
	tags: z.array(z.string().max(64)).max(20).optional(),
	cases: z.array(SuiteCaseSchema).optional(),
})

export type SuiteDefinitionInput = z.infer<typeof SuiteDefinitionSchema>
export type SuiteCaseInput = z.infer<typeof SuiteCaseSchema>
