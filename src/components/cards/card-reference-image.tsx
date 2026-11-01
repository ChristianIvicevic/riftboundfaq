'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

const IMAGE_CLASS_NAME = 'm-0! block h-auto w-full max-w-55 rounded-lg object-contain sm:max-w-46'

export function CardReferenceImage({
	className,
	height,
	loading,
	name,
	src,
	width,
}: {
	className?: string
	height: number
	loading?: 'eager' | 'lazy'
	name: string
	src: string
	width: number
}) {
	const [failed, setFailed] = useState(false)

	if (failed) {
		return (
			<div
				aria-label={`${name} card image unavailable`}
				className={cn(
					IMAGE_CLASS_NAME,
					'flex flex-col items-center justify-center border border-dashed border-fd-border bg-fd-background p-3 text-center',
					className,
				)}
				role="img"
				style={{ aspectRatio: `${width} / ${height}` }}
			>
				<span className="text-xs text-fd-muted-foreground">Card image unavailable</span>
				<span className="mt-1 text-sm font-medium text-fd-foreground">{name}</span>
			</div>
		)
	}

	return (
		<img
			alt={`${name} card`}
			className={cn(IMAGE_CLASS_NAME, className)}
			height={height}
			loading={loading}
			onError={() => setFailed(true)}
			src={src}
			width={width}
		/>
	)
}
