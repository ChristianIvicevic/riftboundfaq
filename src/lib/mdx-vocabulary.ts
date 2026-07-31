export type TermVariant = 'primary' | 'secondary' | 'accent' | 'tertiary'

type TermDefinition = {
	label: string
	variant: TermVariant
	hasValue?: true
}

export const TERM_DEFINITIONS = {
	Accelerate: { label: 'Accelerate', variant: 'primary' },
	Action: { label: 'Action', variant: 'primary' },
	Add: { label: 'Add', variant: 'tertiary' },
	Ambush: { label: 'Ambush', variant: 'primary' },
	Assault: { label: 'Assault', variant: 'accent', hasValue: true },
	Burn: { label: 'Burn', variant: 'tertiary', hasValue: true },
	Deathknell: { label: 'Deathknell', variant: 'secondary' },
	Deflect: { label: 'Deflect', variant: 'secondary', hasValue: true },
	Equip: { label: 'Equip', variant: 'tertiary' },
	Empower: { label: 'Empower', variant: 'tertiary' },
	Empowered: { label: 'Empowered', variant: 'secondary' },
	Flow: { label: 'Flow', variant: 'primary', hasValue: true },
	Hidden: { label: 'Hidden', variant: 'primary' },
	Legion: { label: 'Legion', variant: 'primary' },
	Mighty: { label: 'Mighty', variant: 'tertiary' },
	Predict: { label: 'Predict', variant: 'tertiary' },
	QuickDraw: { label: 'Quick-Draw', variant: 'primary' },
	Reaction: { label: 'Reaction', variant: 'primary' },
	Repeat: { label: 'Repeat', variant: 'primary' },
	Shield: { label: 'Shield', variant: 'accent', hasValue: true },
	Stun: { label: 'Stun', variant: 'tertiary' },
	Temporary: { label: 'Temporary', variant: 'secondary' },
	Weaponmaster: { label: 'Weaponmaster', variant: 'tertiary' },
} as const satisfies Record<string, TermDefinition>

export type TermName = keyof typeof TERM_DEFINITIONS

export const RUNE_NAMES = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'] as const
