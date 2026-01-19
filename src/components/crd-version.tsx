import { createContext, type ReactNode } from 'react'

export const CrdVersionContext = createContext<{ crdVersion?: string }>({})

export function CrdVersionProvider({ crdVersion, children }: { crdVersion?: string; children: ReactNode }) {
	return <CrdVersionContext value={{ crdVersion }}>{children}</CrdVersionContext>
}
