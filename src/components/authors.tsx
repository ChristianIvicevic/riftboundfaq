export function Authors({ authors }: { authors: string[] }) {
	return (
		<div className="text-sm text-fd-muted-foreground flex gap-6">
			<div>{authors.length === 1 ? 'Author' : 'Authors'}:</div>
			<div className="flex-1 flex flex-col gap-2">
				{authors.map((it) => (
					<span key={it} className="text-fd-secondary-foreground">
						{it}
					</span>
				))}
			</div>
		</div>
	)
}
