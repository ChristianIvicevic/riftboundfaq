const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u
const NAMED_DATE = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/u
const MONTH_NUMBERS: Readonly<Record<string, number>> = {
	January: 1,
	February: 2,
	March: 3,
	April: 4,
	May: 5,
	June: 6,
	July: 7,
	August: 8,
	September: 9,
	October: 10,
	November: 11,
	December: 12,
}

export function normalizeRulesDate(value: string, label = 'Last Updated'): string {
	if (!value.trim()) throw new Error(`${label} is missing`)
	const input = value.trim()
	const isoMatch = ISO_DATE.exec(input)
	const slashMatch = SLASH_DATE.exec(input)
	const namedMatch = NAMED_DATE.exec(input)
	const namedMonth = namedMatch ? MONTH_NUMBERS[namedMatch[1]] : undefined
	const parts = isoMatch
		? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
		: slashMatch
			? { year: Number(slashMatch[3]), month: Number(slashMatch[1]), day: Number(slashMatch[2]) }
			: namedMatch && namedMonth
				? { year: Number(namedMatch[3]), month: namedMonth, day: Number(namedMatch[2]) }
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
