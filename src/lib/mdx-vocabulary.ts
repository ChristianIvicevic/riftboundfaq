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
	Buff: { label: 'Buff', variant: 'tertiary' },
	Burn: { label: 'Burn', variant: 'tertiary', hasValue: true },
	Deathknell: { label: 'Deathknell', variant: 'secondary' },
	Deflect: { label: 'Deflect', variant: 'secondary', hasValue: true },
	Deploy: { label: 'Deploy', variant: 'primary' },
	Equip: { label: 'Equip', variant: 'tertiary' },
	Empower: { label: 'Empower', variant: 'tertiary' },
	Empowered: { label: 'Empowered', variant: 'secondary' },
	Flow: { label: 'Flow', variant: 'primary', hasValue: true },
	Ganking: { label: 'Ganking', variant: 'secondary' },
	Hidden: { label: 'Hidden', variant: 'primary' },
	Legion: { label: 'Legion', variant: 'primary' },
	Level: { label: 'Level', variant: 'secondary', hasValue: true },
	Mighty: { label: 'Mighty', variant: 'tertiary' },
	Predict: { label: 'Predict', variant: 'tertiary' },
	QuickDraw: { label: 'Quick-Draw', variant: 'primary' },
	Reaction: { label: 'Reaction', variant: 'primary' },
	Repeat: { label: 'Repeat', variant: 'primary' },
	Shield: { label: 'Shield', variant: 'accent', hasValue: true },
	ShowOff: { label: 'Show Off', variant: 'primary' },
	Stun: { label: 'Stun', variant: 'tertiary' },
	Tank: { label: 'Tank', variant: 'accent' },
	Temporary: { label: 'Temporary', variant: 'secondary' },
	Vision: { label: 'Vision', variant: 'tertiary' },
	Weaponmaster: { label: 'Weaponmaster', variant: 'tertiary' },
} as const satisfies Record<string, TermDefinition>

export type TermName = keyof typeof TERM_DEFINITIONS

export const RUNE_NAMES = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'] as const
