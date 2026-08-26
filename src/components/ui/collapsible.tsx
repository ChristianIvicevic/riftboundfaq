'use client'

import * as Primitive from '@radix-ui/react-collapsible'
import { ComponentProps, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export const Collapsible = Primitive.Root

export function CollapsibleContent({
	children,
	...props
}: ComponentProps<typeof Primitive.CollapsibleContent>) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	return (
		<Primitive.CollapsibleContent
			{...props}
			className={cn(
				'overflow-hidden',
				mounted &&
					'data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down',
				props.className,
			)}
		>
			{children}
		</Primitive.CollapsibleContent>
	)
}
