const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u

export function normalizeRulesDate(value: unknown, label = 'Last Updated'): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is missing`)
	const input = value.trim()
	const isoMatch = ISO_DATE.exec(input)
	const slashMatch = SLASH_DATE.exec(input)
	const parts = isoMatch
		? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
		: slashMatch
			? { year: Number(slashMatch[3]), month: Number(slashMatch[1]), day: Number(slashMatch[2]) }
			: undefined
	if (!parts) throw new Error(`${label} ${JSON.stringify(value)} is not a recognized date`)

	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
	if (
		date.getUTCFullYear() !== parts.year ||
		date.getUTCMonth() !== parts.month - 1 ||
		date.getUTCDate() !== parts.day
	) {
		throw new Error(`${label} ${JSON.stringify(value)} is not a valid date`)
	}
	return date.toISOString().slice(0, 10)
}
