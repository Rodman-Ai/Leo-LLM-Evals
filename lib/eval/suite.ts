import type { Scorer } from './scorer'

export type Case = {
	input: string
	expected?: string
	tags?: string[]
	metadata?: Record<string, unknown>
	scorers: Scorer[]
}

export type PromptFn = (ctx: { input: string; metadata: Record<string, unknown> }) => string

export type SuiteDef = {
	name: string
	description?: string
	tags?: string[]
	models: string[]
	prompt: PromptFn
	concurrency?: number
	cases: Case[]
}

export function defineSuite(def: SuiteDef): SuiteDef {
	if (!def.name) throw new Error('defineSuite: name is required')
	if (!def.models?.length) throw new Error(`defineSuite(${def.name}): at least one model required`)
	if (!def.cases?.length) throw new Error(`defineSuite(${def.name}): at least one case required`)
	return def
}
