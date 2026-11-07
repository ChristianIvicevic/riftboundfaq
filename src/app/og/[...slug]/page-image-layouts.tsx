import { SITE_NAME } from '@/lib/site'

export type PageImageEdition = Readonly<{
	name: string
	version?: string
	logoSrc?: string
}>

export type PageImageVisual =
	| Readonly<{ kind: 'card'; src: string; width: number; height: number }>
	| Readonly<{ kind: 'site-mark' }>
	| Readonly<{ kind: 'wordmark'; primary?: string; accent: string }>
	| Readonly<{
			kind: 'keyword'
			label: string
			backgroundColor: string
			accentColor: string
	  }>
	| Readonly<{ kind: 'rules-edition'; edition: PageImageEdition }>
	| Readonly<{ kind: 'rules-transition'; from: PageImageEdition; current: PageImageEdition }>

export type PageImageData = Readonly<{
	title: string
	description: string
	railLabel: string
	railContext?: string
	visual: PageImageVisual
}>

const GOLD = '#f4cc52'
const BACKGROUND = '#0c0c0c'
const MUTED = 'rgba(240, 240, 240, 0.72)'
const FAINT = 'rgba(240, 240, 240, 0.38)'

function assertNever(value: never): never {
	throw new Error(`Unhandled page image visual ${JSON.stringify(value)}`)
}

function titleFontSize(title: string) {
	if (title.length > 48) return '50px'
	if (title.length > 36) return '56px'
	return '64px'
}

function wordmarkFontSize(label: string) {
	if (label.length > 12) return '48px'
	if (label.length > 9) return '58px'
	return '72px'
}

function Brand({ logoSrc }: { logoSrc: string }) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '46px',
				right: '58px',
				alignItems: 'center',
				gap: '13px',
				color: GOLD,
			}}
		>
			<img src={logoSrc} alt="" width={36} height={36} style={{ objectFit: 'contain' }} />
			<span style={{ fontSize: '27px', fontWeight: 750 }}>{SITE_NAME}</span>
		</div>
	)
}

function Intro({ data }: { data: PageImageData }) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '104px',
				left: '64px',
				flexDirection: 'column',
				width: '690px',
			}}
		>
			<h1
				style={{
					margin: 0,
					fontSize: titleFontSize(data.title),
					fontWeight: 820,
					lineHeight: 1.02,
					letterSpacing: '-2.5px',
				}}
			>
				{data.title}
			</h1>
			<p
				style={{
					width: '650px',
					margin: '24px 0 0',
					color: MUTED,
					fontSize: '31px',
					lineHeight: 1.24,
				}}
			>
				{data.description}
			</p>
		</div>
	)
}

function ContextRail({ data }: { data: PageImageData }) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				left: '64px',
				bottom: '48px',
				alignItems: 'center',
				justifyContent: 'space-between',
				width: '1072px',
				paddingTop: '18px',
				borderTop: '2px solid #303030',
			}}
		>
			<span style={{ color: GOLD, fontSize: '18px', fontWeight: 800, letterSpacing: '3px' }}>
				{data.railLabel}
			</span>
			{data.railContext ? (
				<span
					style={{
						paddingLeft: '18px',
						color: MUTED,
						backgroundColor: BACKGROUND,
						fontSize: '20px',
						fontWeight: 750,
						letterSpacing: '1.5px',
					}}
				>
					{data.railContext.toUpperCase()}
				</span>
			) : null}
		</div>
	)
}

function CardVisual({ height, src, width }: Extract<PageImageVisual, { kind: 'card' }>) {
	const isLandscape = width > height
	const displayWidth = isLandscape ? 600 : 500
	const displayHeight = Math.round((displayWidth * height) / width)

	return (
		<img
			src={src}
			alt=""
			width={displayWidth}
			height={displayHeight}
			style={{
				position: 'absolute',
				right: isLandscape ? '-90px' : '-36px',
				bottom: isLandscape ? '-25px' : '-240px',
				objectFit: 'contain',
				opacity: 0.58,
				transform: `rotate(${isLandscape ? 3 : 5}deg)`,
				filter: 'saturate(0.82)',
			}}
		/>
	)
}

function SiteMarkVisual({ logoSrc }: { logoSrc: string }) {
	return (
		<img
			src={logoSrc}
			alt=""
			width={390}
			height={390}
			style={{
				position: 'absolute',
				top: '135px',
				right: '-18px',
				objectFit: 'contain',
				opacity: 0.22,
				transform: 'rotate(6deg)',
			}}
		/>
	)
}

function WordmarkVisual({ accent, primary }: Extract<PageImageVisual, { kind: 'wordmark' }>) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '158px',
				right: '44px',
				flexDirection: 'column',
				alignItems: 'flex-end',
				justifyContent: 'center',
				width: '380px',
				height: '250px',
			}}
		>
			{primary ? (
				<span
					style={{
						color: FAINT,
						fontSize: wordmarkFontSize(primary),
						fontWeight: 820,
						lineHeight: 0.92,
						letterSpacing: '-2px',
					}}
				>
					{primary.toUpperCase()}
				</span>
			) : null}
			<span
				style={{
					marginTop: primary ? '6px' : 0,
					color: GOLD,
					fontSize: wordmarkFontSize(accent),
					fontWeight: 850,
					lineHeight: 0.96,
					letterSpacing: '-2px',
					opacity: 0.68,
				}}
			>
				{accent.toUpperCase()}
			</span>
		</div>
	)
}

function KeywordVisual({
	accentColor,
	backgroundColor,
	label,
}: Extract<PageImageVisual, { kind: 'keyword' }>) {
	const stylizedLabel = `/${label.toUpperCase()}/`

	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '165px',
				right: '42px',
				flexDirection: 'column',
				alignItems: 'flex-end',
				justifyContent: 'center',
				width: '390px',
				height: '235px',
			}}
		>
			<span
				style={{
					color: accentColor,
					fontSize: wordmarkFontSize(stylizedLabel),
					fontWeight: 850,
					lineHeight: 1,
					letterSpacing: '-2px',
					opacity: 0.82,
				}}
			>
				{stylizedLabel}
			</span>
			<div
				style={{
					display: 'flex',
					width: '210px',
					height: '8px',
					marginTop: '22px',
					backgroundColor,
					opacity: 0.72,
				}}
			/>
			<span
				style={{
					marginTop: '14px',
					color: FAINT,
					fontSize: '16px',
					fontWeight: 750,
					letterSpacing: '4px',
				}}
			>
				KEYWORD ABILITY
			</span>
		</div>
	)
}

function EditionVisualMark({
	edition,
	height,
	muted = false,
	width,
}: {
	edition: PageImageEdition
	height: number
	muted?: boolean
	width: number
}) {
	return edition.logoSrc ? (
		<img
			src={edition.logoSrc}
			alt=""
			width={width}
			height={height}
			style={{
				objectFit: 'contain',
				opacity: muted ? 0.4 : 0.88,
				filter: muted ? 'grayscale(1)' : undefined,
			}}
		/>
	) : (
		<span
			style={{
				color: muted ? FAINT : GOLD,
				fontSize: muted ? '29px' : '40px',
				fontWeight: 850,
				letterSpacing: '4px',
			}}
		>
			{edition.name.toUpperCase()}
		</span>
	)
}

function RulesEditionVisual({ edition }: Extract<PageImageVisual, { kind: 'rules-edition' }>) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '152px',
				right: '42px',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width: '390px',
				height: '270px',
			}}
		>
			<EditionVisualMark edition={edition} width={330} height={170} />
			<span
				style={{
					marginTop: '20px',
					color: FAINT,
					fontSize: '17px',
					fontWeight: 750,
					letterSpacing: '4px',
				}}
			>
				CORE RULES
			</span>
		</div>
	)
}

function RulesTransitionVisual({ current, from }: Extract<PageImageVisual, { kind: 'rules-transition' }>) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '138px',
				right: '30px',
				width: '430px',
				height: '300px',
			}}
		>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: '14px',
					left: 0,
					alignItems: 'center',
					justifyContent: 'center',
					width: '260px',
					height: '125px',
					transform: 'rotate(-3deg)',
				}}
			>
				<EditionVisualMark edition={from} width={250} height={118} muted />
			</div>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: '124px',
					left: '144px',
					alignItems: 'center',
					gap: '10px',
					color: GOLD,
					opacity: 0.62,
					transform: 'rotate(-9deg)',
				}}
			>
				<div style={{ display: 'flex', width: '62px', height: '2px', backgroundColor: GOLD }} />
				<span style={{ fontSize: '17px', fontWeight: 850, letterSpacing: '2px' }}>TO</span>
				<div style={{ display: 'flex', width: '62px', height: '2px', backgroundColor: GOLD }} />
			</div>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					right: 0,
					bottom: '6px',
					alignItems: 'center',
					justifyContent: 'center',
					width: '345px',
					height: '165px',
					transform: 'rotate(2deg)',
				}}
			>
				<EditionVisualMark edition={current} width={335} height={160} />
			</div>
		</div>
	)
}

function Visual({ logoSrc, visual }: { logoSrc: string; visual: PageImageVisual }) {
	switch (visual.kind) {
		case 'card':
			return <CardVisual {...visual} />
		case 'site-mark':
			return <SiteMarkVisual logoSrc={logoSrc} />
		case 'wordmark':
			return <WordmarkVisual {...visual} />
		case 'keyword':
			return <KeywordVisual {...visual} />
		case 'rules-edition':
			return <RulesEditionVisual {...visual} />
		case 'rules-transition':
			return <RulesTransitionVisual {...visual} />
	}
	return assertNever(visual)
}

export function PageImage({ data, logoSrc }: { data: PageImageData; logoSrc: string }) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				borderBottom: `18px solid ${GOLD}`,
				color: 'white',
				backgroundColor: BACKGROUND,
			}}
		>
			<Visual visual={data.visual} logoSrc={logoSrc} />
			<Intro data={data} />
			<Brand logoSrc={logoSrc} />
			<ContextRail data={data} />
		</div>
	)
}
