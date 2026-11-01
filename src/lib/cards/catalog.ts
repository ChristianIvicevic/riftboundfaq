import { CARD_REFERENCES } from '@/generated/card-index'

const CARD_REFERENCES_BY_NAME = new Map(Object.entries(CARD_REFERENCES))

export const CARD_NAMES = Object.freeze([...CARD_REFERENCES_BY_NAME.keys()])

export function getCardImageUrl(name: string) {
	return getCardReference(name)?.imageUrl
}

export function getCardReference(name: string) {
	return CARD_REFERENCES_BY_NAME.get(name)
}
