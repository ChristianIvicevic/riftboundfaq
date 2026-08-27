import type { Author } from '@/lib/content/author'

export function PageAttribution({ authors, lastModified }: { authors: Author[]; lastModified?: Date }) {
	if (authors.length === 0 && !lastModified) return null

	const listFormat = new Intl.ListFormat('en')
	const authorParts = listFormat.formatToParts(authors.map((_, index) => index.toString()))

	return (
		<div className="flex flex-col gap-1 pt-2 sm:flex-row">
			{authors.length > 0 && (
				<p className="text-sm text-fd-muted-foreground">
					Written by{' '}
					{authorParts.map((item, index) => {
						if (item.type !== 'element') return <span key={index}>{item.value}</span>

						const author = authors[Number(item.value)]
						return author.url ? (
							<a
								key={index}
								href={author.url}
								rel="noopener noreferrer"
								target="_blank"
								className="text-fd-primary underline decoration-fd-primary/35 underline-offset-2 hover:decoration-fd-primary"
							>
								{author.name}
							</a>
						) : (
							<span key={index} className="text-fd-secondary-foreground">
								{author.name}
							</span>
						)
					})}
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
