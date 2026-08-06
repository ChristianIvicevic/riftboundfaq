export type RulesDocumentContent = {
	kind: 'paragraph' | 'example' | 'reference' | 'bullet'
	text: string
}

export type RulesDocumentHeading = {
	sequence: number
	id: string
	text: string
}
