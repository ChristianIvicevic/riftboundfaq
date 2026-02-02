'use client'

import { useEffect, useState } from 'react'

export function LastUpdated(props: { value: Date }) {
	const [date, setDate] = useState<string | undefined>()

	useEffect(() => {
		setDate(props.value.toLocaleDateString())
	}, [props.value])

	return (
		<>{date !== undefined && <p className="text-sm text-fd-muted-foreground">Last updated on {date}.</p>}</>
	)
}
