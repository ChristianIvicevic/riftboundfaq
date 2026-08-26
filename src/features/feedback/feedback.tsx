'use client'

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { cva } from 'class-variance-authority'
import { CornerDownRightIcon, ThumbsDown, ThumbsUp } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
	type HTMLAttributes,
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
} from 'react'
import { buttonVariants } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
	blockFeedback,
	MAX_FEEDBACK_MESSAGE_LENGTH,
	pageFeedback,
	type BlockFeedback,
	type PageFeedback,
} from '@/features/feedback/schema'
import { cn } from '@/lib/cn'

const rateButtonVariants = cva(
	'inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium border text-sm [&_svg]:size-4 disabled:cursor-not-allowed',
	{
		variants: {
			active: {
				true: 'bg-fd-accent text-fd-accent-foreground [&_svg]:fill-current',
				false: 'text-fd-muted-foreground',
			},
		},
	},
)

export function Feedback({ onSendAction }: { onSendAction: (feedback: PageFeedback) => Promise<void> }) {
	const url = usePathname()
	const { previous, setPrevious } = useSubmissionStorage(url, (value) => {
		const result = pageFeedback.safeParse(value)
		return result.success ? result.data : null
	})
	const [opinion, setOpinion] = useState<'good' | 'bad' | null>(null)
	const [message, setMessage] = useState('')
	const [isPending, startTransition] = useTransition()

	function submit(event?: SyntheticEvent) {
		if (opinion === null) return

		startTransition(async () => {
			const feedback: PageFeedback = { url, opinion, message }

			await onSendAction(feedback)
			setPrevious(feedback)
			setMessage('')
			setOpinion(null)
		})

		event?.preventDefault()
	}

	const activeOpinion = previous?.opinion ?? opinion

	return (
		<Collapsible
			open={opinion !== null || previous !== null}
			onOpenChange={(open) => {
				if (!open) setOpinion(null)
			}}
			className="border-y py-3"
		>
			<div className="flex flex-row items-center gap-2">
				<p className="pe-2 text-sm font-medium">How was this page?</p>
				<button
					disabled={previous !== null}
					className={cn(rateButtonVariants({ active: activeOpinion === 'good' }))}
					onClick={() => {
						setOpinion('good')
					}}
				>
					<ThumbsUp />
					Good
				</button>
				<button
					disabled={previous !== null}
					className={cn(rateButtonVariants({ active: activeOpinion === 'bad' }))}
					onClick={() => {
						setOpinion('bad')
					}}
				>
					<ThumbsDown />
					Bad
				</button>
			</div>
			<CollapsibleContent className="mt-3">
				{previous ? (
					<div className="flex flex-col items-center gap-3 rounded-xl bg-fd-card px-3 py-6 text-center text-sm text-fd-muted-foreground">
						<p>Thank you for your feedback!</p>
						<div className="flex flex-row items-center gap-2">
							<button
								className={cn(buttonVariants({ color: 'secondary' }), 'text-xs')}
								onClick={() => {
									setOpinion(previous.opinion)
									setPrevious(null)
								}}
							>
								Submit Again
							</button>
						</div>
					</div>
				) : (
					<form className="flex flex-col gap-3" onSubmit={submit}>
						<textarea
							autoFocus
							required
							maxLength={MAX_FEEDBACK_MESSAGE_LENGTH}
							value={message}
							onChange={(event) => setMessage(event.target.value)}
							className="resize-none rounded-lg border bg-fd-secondary p-3 text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none"
							placeholder="Leave your feedback..."
							onKeyDown={(event) => {
								if (!event.shiftKey && event.key === 'Enter') {
									event.preventDefault()
									event.currentTarget.form?.requestSubmit()
								}
							}}
						/>
						<button
							type="submit"
							className={cn(buttonVariants({ color: 'outline' }), 'w-fit px-3')}
							disabled={isPending}
						>
							Submit
						</button>
					</form>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}

export function FeedbackText({
	onSendAction,
	children,
}: {
	onSendAction: (feedback: BlockFeedback) => Promise<void>
	children?: ReactNode
}) {
	const [popup, setPopup] = useState<{
		mode: 'tooltip' | 'expanded'
		blockId: string
		selection: string
		range: Range
	} | null>(null)

	const containerRef = useRef<HTMLDivElement>(null)
	const { refs, floatingStyles } = useFloating({
		open: popup !== null,
		placement: 'bottom',
		middleware: [offset(6), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	})

	function expandPopup() {
		if (popup?.mode !== 'tooltip') return

		if (typeof Highlight === 'function' && CSS.highlights) {
			const highlight = new Highlight(popup.range)
			CSS.highlights.set('fd-feedback-text', highlight)
		}

		setPopup({ ...popup, mode: 'expanded' })
	}

	function closePopup() {
		if (popup?.mode === 'expanded') CSS.highlights?.delete('fd-feedback-text')

		const activeElement = document.activeElement
		const shouldRestoreFocus =
			popup?.mode === 'expanded' ||
			(activeElement instanceof Node && refs.floating.current?.contains(activeElement))
		if (popup && shouldRestoreFocus) {
			const block = document.querySelector<HTMLElement>(`#${CSS.escape(popup.blockId)}`)
			if (block) {
				const hadTabIndex = block.hasAttribute('tabindex')
				if (!hadTabIndex) block.tabIndex = -1
				block.focus({ preventScroll: true })
				if (!hadTabIndex) {
					block.addEventListener('blur', () => block.removeAttribute('tabindex'), { once: true })
				}
			}
		}

		setPopup(null)
	}

	const updateSelectionPopover = useEffectEvent(() => {
		if (popup?.mode === 'expanded') return

		const container = containerRef.current
		const selection = window.getSelection()

		if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
			closePopup()
			return
		}

		const range = selection.getRangeAt(0).cloneRange()
		if (!container.contains(range.commonAncestorContainer)) {
			closePopup()
			return
		}

		const selectionText = selection.toString().trim()
		if (selectionText.length === 0 || selectionText.includes('\n')) {
			closePopup()
			return
		}

		const element =
			range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
		const blockId = element?.closest('[data-block="feedback"]')?.id
		if (!blockId) {
			closePopup()
			return
		}

		refs.setReference({
			getBoundingClientRect() {
				return range.getBoundingClientRect()
			},
			contextElement: container,
		})

		setPopup({ mode: 'tooltip', range, selection: selectionText, blockId })
	})

	const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
		if (popup !== null && event.key === 'Escape') closePopup()
	})

	const closeOnPointerDown = useEffectEvent((event: PointerEvent) => {
		const target = event.target
		if (popup === null || !(target instanceof Node)) return

		if (
			refs.floating.current?.contains(target) ||
			(popup.mode === 'tooltip' && containerRef.current?.contains(target))
		) {
			return
		}

		closePopup()
	})

	useEffect(() => {
		let frame: number | null = null

		function scheduleSelectionPopover() {
			if (frame !== null) window.cancelAnimationFrame(frame)

			frame = window.requestAnimationFrame(() => {
				frame = null
				updateSelectionPopover()
			})
		}

		document.addEventListener('selectionchange', scheduleSelectionPopover)
		document.addEventListener('keydown', closeOnEscape)
		document.addEventListener('pointerdown', closeOnPointerDown)

		return () => {
			document.removeEventListener('keydown', closeOnEscape)
			document.removeEventListener('pointerdown', closeOnPointerDown)
			document.removeEventListener('selectionchange', scheduleSelectionPopover)
			if (frame !== null) window.cancelAnimationFrame(frame)
			CSS.highlights?.delete('fd-feedback-text')
		}
	}, [])

	return (
		<>
			<div
				ref={containerRef}
				className="prose-no-margin [&_::highlight(fd-feedback-text)]:bg-fd-primary [&_::highlight(fd-feedback-text)]:text-fd-primary-foreground"
			>
				{children}
			</div>

			{popup && (
				<div
					ref={refs.setFloating}
					role={popup.mode === 'expanded' ? 'dialog' : undefined}
					aria-label={popup.mode === 'expanded' ? 'Feedback on selected text' : undefined}
					className={cn(
						'not-prose z-40 box-content h-9.5 w-30 overflow-hidden rounded-xl border bg-fd-popover text-sm text-fd-popover-foreground shadow-lg transition-[width,height]',
						popup.mode === 'expanded' ? 'h-32 w-75 max-w-[98vw]' : 'select-none',
					)}
					style={floatingStyles}
				>
					{popup.mode === 'tooltip' ? (
						<div className="h-9.5 w-30 p-1">
							<button
								aria-haspopup="dialog"
								className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'size-full gap-1.5')}
								onClick={expandPopup}
							>
								<CornerDownRightIcon className="size-4 text-fd-muted-foreground" />
								Feedback
							</button>
						</div>
					) : (
						<FeedbackTextForm
							blockId={popup.blockId}
							selection={popup.selection}
							onSendAction={onSendAction}
							onClose={closePopup}
							container={{ className: 'p-2 w-[300px] h-32 max-w-[98vw] animate-fd-fade-in' }}
						/>
					)}
				</div>
			)}
		</>
	)
}

function FeedbackTextForm({
	blockId,
	selection,
	onSendAction,
	onClose,
	container,
}: {
	container: HTMLAttributes<HTMLElement>
	blockId: string
	selection: string
	onSendAction: (feedback: BlockFeedback) => Promise<void>
	onClose: () => void
}) {
	const url = usePathname()
	const { previous, setPrevious } = useSubmissionStorage(`${url}-${blockId}`, (value) => {
		const result = blockFeedback.safeParse(value)
		return result.success ? result.data : null
	})
	const [message, setMessage] = useState('')
	const [isPending, startTransition] = useTransition()

	function submit(event?: SyntheticEvent) {
		startTransition(async () => {
			const feedback: BlockFeedback = {
				blockId,
				blockBody: selection,
				url,
				message,
			}

			await onSendAction(feedback)
			setPrevious(feedback)
			setMessage('')
		})

		event?.preventDefault()
	}

	if (previous) {
		return (
			<div
				{...container}
				className={cn(
					'flex flex-col items-center justify-center gap-2 text-center text-fd-muted-foreground',
					container.className,
				)}
			>
				<p>Thank you for your feedback!</p>
				<div className="flex flex-row items-center gap-2">
					<button
						autoFocus
						className={cn(buttonVariants({ color: 'secondary' }), 'text-xs')}
						onClick={() => {
							setPrevious(null)
						}}
					>
						Submit Again
					</button>
				</div>
			</div>
		)
	}

	return (
		<form {...container} className={cn('flex flex-col gap-2', container.className)} onSubmit={submit}>
			<textarea
				autoFocus
				required
				maxLength={MAX_FEEDBACK_MESSAGE_LENGTH}
				value={message}
				onChange={(event) => setMessage(event.target.value)}
				className="resize-none rounded-lg border bg-fd-secondary p-3 text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none"
				placeholder="Leave your feedback..."
				onKeyDown={(event) => {
					if (!event.shiftKey && event.key === 'Enter') {
						event.preventDefault()
						event.currentTarget.form?.requestSubmit()
					}
				}}
			/>
			<div className="mt-auto grid grid-cols-2 gap-2">
				<button
					type="submit"
					className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'gap-1.5')}
					disabled={isPending}
				>
					<CornerDownRightIcon className="size-4" />
					Submit
				</button>
				<button
					type="button"
					className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-1.5')}
					disabled={isPending}
					onClick={onClose}
				>
					Close
				</button>
			</div>
		</form>
	)
}

function useSubmissionStorage<Result>(key: string, validate: (value: unknown) => Result | null) {
	const storageKey = `riftboundfaq-feedback-${key}`
	const [value, setValue] = useState<Result | null>(null)
	const validateCallback = useEffectEvent(validate)

	useEffect(() => {
		const item = localStorage.getItem(storageKey)
		if (item === null) return

		try {
			const validated = validateCallback(JSON.parse(item))
			if (validated === null) localStorage.removeItem(storageKey)
			else setValue(validated)
		} catch {
			localStorage.removeItem(storageKey)
		}
	}, [storageKey])

	return {
		previous: value,
		setPrevious(result: Result | null) {
			if (result) localStorage.setItem(storageKey, JSON.stringify(result))
			else localStorage.removeItem(storageKey)

			setValue(result)
		},
	}
}
