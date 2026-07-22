import { CRD_VERSIONS } from '@/components/core-rules/data'
import { findCoreRuleReferences } from '@/components/core-rules/references'
import { RulesTable } from '@/components/rules/table'
import { CURRENT_CRD_VERSION } from '@/lib/constants'

export function CoreRulesTable({ version = CURRENT_CRD_VERSION }: { version?: string }) {
	const crd = CRD_VERSIONS[version]
	if (!crd) throw new Error(`CoreRulesTable: unknown version ${JSON.stringify(version)}`)

	return <RulesTable rules={crd.rules} findReferences={findCoreRuleReferences} />
}
