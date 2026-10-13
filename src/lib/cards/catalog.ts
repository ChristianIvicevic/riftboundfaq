import { CARD_IMAGE_URLS } from '@/generated/card-index'

const CARD_IMAGES_BY_NAME = new Map(Object.entries(CARD_IMAGE_URLS))

export const CARD_NAMES = Object.freeze([...CARD_IMAGES_BY_NAME.keys()])

export function getCardImageUrl(name: string) {
	return CARD_IMAGES_BY_NAME.get(name)
}
