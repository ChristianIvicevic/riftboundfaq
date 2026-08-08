import type { ReactNode } from 'react'

export interface GenerateProps {
	title: ReactNode
	description?: ReactNode
	icon?: ReactNode
	primaryColor?: string
	primaryTextColor?: string
	site?: ReactNode
}

export function generate({
	primaryColor = 'rgba(255,150,255,0.3)',
	primaryTextColor = 'rgb(255,150,255)',
	icon,
	...props
}: GenerateProps) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: '100%',
				color: 'white',
				padding: '4rem',
				backgroundColor: '#0c0c0c',
				borderBottom: `18px solid ${primaryColor}`,
			}}
		>
			<p
				style={{
					fontWeight: 800,
					fontSize: '82px',
					margin: 0,
				}}
			>
				{props.title}
			</p>
			<p
				style={{
					fontSize: '52px',
					color: 'rgba(240,240,240,0.8)',
					margin: 0,
					marginTop: '16px',
					paddingBottom: '28px',
				}}
			>
				{props.description}
			</p>

			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: '20px',
					marginTop: 'auto',
					color: primaryTextColor,
				}}
			>
				{icon}
				{props.site && (
					<p
						style={{
							fontSize: '56px',
							fontWeight: 600,
							margin: 0,
						}}
					>
						{props.site}
					</p>
				)}
			</div>
		</div>
	)
}
