export function EditPageLink({ filePath }: { filePath: string }) {
	return (
		<a
			className="hover:text-fd-foreground transition-colors flex gap-2 items-center"
			href={`https://github.com/ChristianIvicevic/riftboundfaq/blob/main/content/${filePath}`}
			rel="noopener noreferrer"
			target="_blank"
		>
			{/** biome-ignore lint/a11y/noSvgWithoutTitle: Ignore title */}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="size-4"
			>
				<path d="M13 21h8" />
				<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
			</svg>
			Edit this page
		</a>
	)
}
