'use client'

import { SidebarProvider as BaseSidebarProvider } from 'fumadocs-ui/components/sidebar/base'
import { Sidebar, SidebarDrawer, type SidebarProviderProps } from 'fumadocs-ui/layouts/spacious/slots/sidebar'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function NavigationSidebarProvider(props: SidebarProviderProps) {
	return <BaseSidebarProvider {...props} collapsible={false} />
}

export function NavigationSidebar({ className, ...props }: ComponentProps<typeof Sidebar>) {
	// Spacious does not expose its desktop title row as a slot, so remove it from the version-pinned shell.
	return <Sidebar {...props} className={cn('[&>div>div:first-child]:hidden', className)} />
}

export function NavigationSidebarDrawer() {
	return <SidebarDrawer />
}
