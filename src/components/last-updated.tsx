export function LastUpdated({ value }: { value: Date }) {
	return (
		<p className="text-sm text-fd-muted-foreground">
			Last updated on{' '}
			<time dateTime={value.toISOString()}>
				{value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
			</time>
			.
		</p>
	)
}
