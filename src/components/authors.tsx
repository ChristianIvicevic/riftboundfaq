export function Authors({ authors }: { authors: string[] }) {
	const listFormat = new Intl.ListFormat('en')

	return (
		<p className="text-sm text-fd-muted-foreground">
			Written by{' '}
			{listFormat.formatToParts(authors).map((item, index) => (
				<span key={index} className={item.type === 'element' ? 'text-fd-secondary-foreground' : undefined}>
					{item.value}
				</span>
			))}
			.
		</p>
	)
}
