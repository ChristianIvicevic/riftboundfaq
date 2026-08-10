export type RuleRecord = { id: string; lines: readonly string[] }

export type RuleIdLookup = Pick<ReadonlySet<string>, 'has'>

export type RuleReference = {
	id: string
	start: number
	end: number
}
