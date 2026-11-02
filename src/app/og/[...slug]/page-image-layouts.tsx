import type { ReactNode } from 'react'

type PageImageProps = {
	title: string
	description: string
	cardImageSrc: string
	logoSrc: string
	site: string
}

function Brand({ logoSrc, site }: { logoSrc: string; site: string }) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '18px',
				color: '#f4cc52',
			}}
		>
			<img src={logoSrc} alt="" width={50} height={50} style={{ objectFit: 'contain' }} />
			<span style={{ fontSize: '42px', fontWeight: 700 }}>{site}</span>
		</div>
	)
}

function Eyebrow({ label }: { label: string }) {
	return (
		<div
			style={{
				display: 'flex',
				alignSelf: 'flex-start',
				padding: '8px 14px',
				border: '2px solid rgba(244, 204, 82, 0.55)',
				borderRadius: '999px',
				color: '#f4cc52',
				fontSize: '20px',
				fontWeight: 800,
				letterSpacing: '2px',
			}}
		>
			{label}
		</div>
	)
}

function PageImageLayout({
	title,
	description,
	logoSrc,
	site,
	eyebrow,
	visual,
	titleFontSize = '76px',
	titleWidth = '760px',
	descriptionFontSize = '37px',
	descriptionWidth = '720px',
}: Omit<PageImageProps, 'cardImageSrc'> & {
	eyebrow: string
	visual: ReactNode
	titleFontSize?: string
	titleWidth?: string
	descriptionFontSize?: string
	descriptionWidth?: string
}) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				color: 'white',
				backgroundColor: '#0c0c0c',
				borderBottom: '18px solid #f4cc52',
			}}
		>
			{visual}
			<div
				style={{
					display: 'flex',
					position: 'relative',
					flexDirection: 'column',
					width: '830px',
					height: '100%',
					padding: '58px 0 46px 64px',
				}}
			>
				<Eyebrow label={eyebrow} />
				<h1
					style={{
						width: titleWidth,
						margin: '24px 0 0',
						fontSize: titleFontSize,
						fontWeight: 850,
						lineHeight: 1,
						letterSpacing: '-3px',
					}}
				>
					{title}
				</h1>
				<p
					style={{
						width: descriptionWidth,
						margin: '22px 0 0',
						fontSize: descriptionFontSize,
						lineHeight: 1.22,
						color: 'rgba(240, 240, 240, 0.78)',
					}}
				>
					{description}
				</p>
				<div style={{ display: 'flex', marginTop: 'auto' }}>
					<Brand logoSrc={logoSrc} site={site} />
				</div>
			</div>
		</div>
	)
}

function TiltedCategoryCover({
	primary,
	accent,
	accentFontSize,
	kicker = 'RIFTBOUND',
	kickerFontSize = '24px',
	kickerLetterSpacing = '5px',
	primaryFontSize = '88px',
	accentLineHeight = 0.98,
}: {
	primary?: string
	accent: string
	accentFontSize: string
	kicker?: string
	kickerFontSize?: string
	kickerLetterSpacing?: string
	primaryFontSize?: string
	accentLineHeight?: number
}) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				right: '-54px',
				bottom: '-142px',
				flexDirection: 'column',
				width: '470px',
				height: '570px',
				padding: '46px 42px',
				border: '2px solid rgba(244, 204, 82, 0.4)',
				borderRadius: '28px',
				backgroundColor: '#17150f',
				opacity: 0.56,
				transform: 'rotate(5deg)',
			}}
		>
			<span
				style={{
					color: '#f4cc52',
					fontSize: kickerFontSize,
					fontWeight: 800,
					letterSpacing: kickerLetterSpacing,
				}}
			>
				{kicker}
			</span>
			<div
				style={{
					display: 'flex',
					width: '100%',
					height: '2px',
					margin: '28px 0 34px',
					backgroundColor: 'rgba(244, 204, 82, 0.55)',
				}}
			/>
			{primary ? (
				<span style={{ fontSize: primaryFontSize, fontWeight: 850, lineHeight: 0.92, letterSpacing: '-3px' }}>
					{primary}
				</span>
			) : null}
			<span
				style={{
					color: '#f4cc52',
					fontSize: accentFontSize,
					fontWeight: 850,
					lineHeight: accentLineHeight,
				}}
			>
				{accent}
			</span>
		</div>
	)
}

export function LandingPageImage({
	title,
	description,
	logoSrc,
	site,
}: Omit<PageImageProps, 'cardImageSrc'>) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="RIFTBOUND FAQ"
			titleFontSize="64px"
			titleWidth="700px"
			descriptionFontSize="34px"
			visual={
				<img
					src={logoSrc}
					alt=""
					width={500}
					height={500}
					style={{
						position: 'absolute',
						right: '-72px',
						bottom: '-116px',
						objectFit: 'contain',
						opacity: 0.24,
						transform: 'rotate(6deg)',
					}}
				/>
			}
		/>
	)
}

export function EditorialPageImage({
	title,
	description,
	logoSrc,
	site,
}: Omit<PageImageProps, 'cardImageSrc'>) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="EDITORIAL"
			titleFontSize="60px"
			titleWidth="600px"
			descriptionFontSize="34px"
			visual={
				<TiltedCategoryCover
					primary="SITE"
					accent="UPDATE"
					accentFontSize="76px"
					kicker="RIFTBOUND FAQ"
					kickerFontSize="22px"
					kickerLetterSpacing="4px"
				/>
			}
		/>
	)
}

export function IndexCoverPageImage({
	title,
	description,
	logoSrc,
	site,
	eyebrow,
	coverPrimary,
	coverAccent,
	coverAccentFontSize,
}: Omit<PageImageProps, 'cardImageSrc'> & {
	eyebrow: string
	coverPrimary?: string
	coverAccent: string
	coverAccentFontSize: string
}) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow={eyebrow}
			titleFontSize="68px"
			titleWidth="700px"
			visual={
				<TiltedCategoryCover
					primary={coverPrimary}
					accent={coverAccent}
					accentFontSize={coverAccentFontSize}
				/>
			}
		/>
	)
}

export function CardPageImage({
	title,
	description,
	cardImageSrc,
	cardImageWidth = 744,
	cardImageHeight = 1039,
	logoSrc,
	site,
}: PageImageProps & { cardImageWidth?: number; cardImageHeight?: number }) {
	const isLandscape = cardImageWidth > cardImageHeight
	const displayWidth = isLandscape ? 700 : 500
	const displayHeight = Math.round((displayWidth * cardImageHeight) / cardImageWidth)

	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="CARD RULINGS"
			descriptionWidth={isLandscape ? '640px' : undefined}
			visual={
				<img
					src={cardImageSrc}
					alt=""
					width={displayWidth}
					height={displayHeight}
					style={{
						position: 'absolute',
						right: isLandscape ? '-240px' : '-36px',
						bottom: isLandscape ? '-128px' : '-240px',
						objectFit: 'contain',
						opacity: 0.58,
						transform: 'rotate(5deg)',
						filter: 'saturate(0.82)',
					}}
				/>
			}
		/>
	)
}

export function GeneralRulesPageImage({
	title,
	description,
	logoSrc,
	site,
}: Omit<PageImageProps, 'cardImageSrc'>) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="GENERAL RULES"
			visual={
				<TiltedCategoryCover
					primary="GENERAL"
					accent="RULES"
					primaryFontSize="76px"
					accentFontSize="98px"
					accentLineHeight={0.92}
				/>
			}
		/>
	)
}

export function KeywordMechanicPageImage({
	title,
	description,
	logoSrc,
	site,
	backgroundColor,
	textColor,
	accentColor,
	fontSize,
}: Omit<PageImageProps, 'cardImageSrc'> & {
	backgroundColor: string
	textColor: string
	accentColor: string
	fontSize: string
}) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="MECHANIC"
			visual={
				<div
					style={{
						display: 'flex',
						position: 'absolute',
						right: '-68px',
						bottom: '92px',
						flexDirection: 'column',
						alignItems: 'flex-end',
						width: '550px',
						opacity: 0.62,
						transform: 'rotate(5deg)',
					}}
				>
					<div
						style={{
							display: 'flex',
							width: '550px',
							padding: '26px 34px',
							color: textColor,
							backgroundColor,
						}}
					>
						<span
							style={{
								fontSize,
								fontWeight: 850,
								letterSpacing: '-2px',
							}}
						>
							{title.toUpperCase()}
						</span>
					</div>
					<div
						style={{
							display: 'flex',
							margin: '18px 38px 0 0',
							padding: '8px 18px',
							border: `2px solid ${accentColor}`,
							color: accentColor,
							fontSize: '22px',
							fontWeight: 800,
							letterSpacing: '4px',
						}}
					>
						KEYWORD ABILITY
					</div>
				</div>
			}
		/>
	)
}

export function MechanicTopicPageImage({
	title,
	description,
	logoSrc,
	site,
}: Omit<PageImageProps, 'cardImageSrc'>) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="MECHANIC"
			visual={<TiltedCategoryCover primary="GAME" accent="MECHANICS" accentFontSize="58px" />}
		/>
	)
}

export function RulesReferencePageImage({
	title,
	description,
	logoSrc,
	site,
	documentLabel,
	versionLabel,
	editionLabel,
	versionFontSize,
}: Omit<PageImageProps, 'cardImageSrc'> & {
	documentLabel: string
	versionLabel: string
	editionLabel: string
	versionFontSize: string
}) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="RULES REFERENCE"
			titleFontSize="62px"
			titleWidth="700px"
			visual={
				<div
					style={{
						display: 'flex',
						position: 'absolute',
						right: '-38px',
						bottom: '-160px',
						flexDirection: 'column',
						width: '450px',
						height: '620px',
						padding: '42px',
						border: '2px solid rgba(244, 204, 82, 0.42)',
						borderRadius: '24px',
						backgroundColor: '#17150f',
						opacity: 0.68,
						transform: 'rotate(5deg)',
					}}
				>
					<span style={{ fontSize: '27px', fontWeight: 800, letterSpacing: '6px' }}>{documentLabel}</span>
					<div
						style={{
							display: 'flex',
							width: '100%',
							height: '2px',
							marginTop: '24px',
							backgroundColor: 'rgba(244, 204, 82, 0.6)',
						}}
					/>
					<span style={{ color: '#f4cc52', fontSize: versionFontSize, fontWeight: 850, lineHeight: 1 }}>
						{versionLabel}
					</span>
					<span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '4px' }}>{editionLabel}</span>
				</div>
			}
		/>
	)
}

export function RulesDiffPageImage({
	title,
	description,
	logoSrc,
	site,
	documentLabel,
	fromLabel,
	toLabel,
	fromFontSize,
	toFontSize,
	titleFontSize,
}: Omit<PageImageProps, 'cardImageSrc'> & {
	documentLabel: string
	fromLabel: string
	toLabel: string
	fromFontSize: string
	toFontSize: string
	titleFontSize: string
}) {
	return (
		<PageImageLayout
			title={title}
			description={description}
			logoSrc={logoSrc}
			site={site}
			eyebrow="RULES CHANGES"
			titleFontSize={titleFontSize}
			titleWidth="700px"
			visual={
				<div
					style={{
						display: 'flex',
						position: 'absolute',
						right: '-54px',
						bottom: '-116px',
						flexDirection: 'column',
						width: '470px',
						height: '560px',
						alignItems: 'center',
						padding: '34px 44px',
						border: '2px solid rgba(244, 204, 82, 0.28)',
						borderRadius: '28px',
						backgroundColor: '#141414',
						opacity: 0.68,
						transform: 'rotate(5deg)',
					}}
				>
					<span style={{ fontSize: '23px', fontWeight: 800, letterSpacing: '5px' }}>{documentLabel}</span>
					<span style={{ fontSize: fromFontSize, fontWeight: 850, lineHeight: 0.94, opacity: 0.45 }}>
						{fromLabel}
					</span>
					<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
						<div style={{ display: 'flex', width: '94px', height: '2px', backgroundColor: '#f4cc52' }} />
						<span style={{ color: '#f4cc52', fontSize: '24px', fontWeight: 850 }}>TO</span>
						<div style={{ display: 'flex', width: '94px', height: '2px', backgroundColor: '#f4cc52' }} />
					</div>
					<span style={{ color: '#f4cc52', fontSize: toFontSize, fontWeight: 850, lineHeight: 0.94 }}>
						{toLabel}
					</span>
				</div>
			}
		/>
	)
}
