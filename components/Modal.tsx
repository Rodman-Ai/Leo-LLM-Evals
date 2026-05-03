'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export type ModalProps = {
	open: boolean
	onClose: () => void
	title: string
	children: ReactNode
	maxWidth?: string
}

/**
 * Lightweight modal built on the native `<dialog>` element. No focus-trap
 * library — `<dialog>`'s `showModal()` handles the focus management,
 * Escape key, and inert background for us.
 */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
	const ref = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = ref.current
		if (!dialog) return
		if (open && !dialog.open) dialog.showModal()
		else if (!open && dialog.open) dialog.close()
	}, [open])

	useEffect(() => {
		const dialog = ref.current
		if (!dialog) return
		const handleClose = () => onClose()
		const handleClick = (e: MouseEvent) => {
			// Click on the backdrop (not the dialog content) closes.
			if (e.target === dialog) onClose()
		}
		dialog.addEventListener('close', handleClose)
		dialog.addEventListener('click', handleClick)
		return () => {
			dialog.removeEventListener('close', handleClose)
			dialog.removeEventListener('click', handleClick)
		}
	}, [onClose])

	return (
		<dialog
			ref={ref}
			className={`m-auto w-full rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm ${maxWidth}`}
		>
			<div className='flex items-start justify-between gap-4 border-b border-border px-6 py-4'>
				<h2 className='text-lg font-semibold'>{title}</h2>
				<button
					type='button'
					onClick={onClose}
					aria-label='Close'
					className='rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
				>
					<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
						<path
							d='M3 3l10 10M13 3L3 13'
							stroke='currentColor'
							strokeWidth='1.5'
							strokeLinecap='round'
						/>
					</svg>
				</button>
			</div>
			<div className='px-6 py-5'>{children}</div>
		</dialog>
	)
}
