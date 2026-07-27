export function PageAttribution({ authors, lastModified }: { authors: string[]; lastModified?: Date }) {
	if (authors.length === 0 && !lastModified) return null

	const listFormat = new Intl.ListFormat('en')

	return (
		<div className="flex gap-1 pt-2">
			{authors.length > 0 && (
				<p className="text-sm text-fd-muted-foreground">
					Written by{' '}
					{listFormat.formatToParts(authors).map((item, index) => (
						<span
							key={index}
							className={item.type === 'element' ? 'text-fd-secondary-foreground' : undefined}
						>
							{item.value}
						</span>
					))}
					.
				</p>
			)}
			{lastModified && (
				<p className="text-sm text-fd-muted-foreground">
					Last updated on{' '}
					<time dateTime={lastModified.toISOString()}>
						{lastModified.toLocaleDateString('en-GB', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
					</time>
					.
				</p>
			)}
		</div>
	)
}
