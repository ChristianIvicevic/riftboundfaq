import type { ReactNode } from 'react'
import { z } from 'zod'
import { TermPopover } from '@/components/term-popover'
import { getGlossaryEntry, type GlossaryItem } from '@/lib/glossary'

const termText = z.string().refine((text) => text.trim().length > 0)

export function Term({ item, children }: { item: GlossaryItem; children?: ReactNode }) {
	const text = termText.safeParse(children)
	if (!text.success) throw new Error('Term requires one non-empty text child')

	const entry = getGlossaryEntry(item)
	return <TermPopover explanation={entry.explanation} text={text.data} title={entry.title} />
}
