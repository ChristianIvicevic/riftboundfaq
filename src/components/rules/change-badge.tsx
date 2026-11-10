import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge'

export type RulesChangeBadgeStatus = 'new' | 'deleted' | 'changed'

const STATUS_LABELS = {
	new: 'Added',
	deleted: 'Removed',
	changed: 'Changed',
} satisfies Record<RulesChangeBadgeStatus, string>

const STATUS_TONES = {
	new: 'positive',
	deleted: 'negative',
	changed: 'caution',
} satisfies Record<RulesChangeBadgeStatus, StatusBadgeTone>

export function RulesChangeBadge({
	status,
	className,
}: {
	status: RulesChangeBadgeStatus
	className?: string
}) {
	return (
		<StatusBadge className={className} tone={STATUS_TONES[status]}>
			{STATUS_LABELS[status]}
		</StatusBadge>
	)
}
