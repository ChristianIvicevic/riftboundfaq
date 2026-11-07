export type RuleIdLookup = Pick<ReadonlySet<string>, 'has'>

export type RuleReference = {
	id: string
	start: number
	end: number
}
