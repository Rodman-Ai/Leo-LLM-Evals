'use client'

import { useEffect, useState } from 'react'

type Mode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'evalbench:theme'

export function ThemeToggle() {
	const [mode, setMode] = useState<Mode>('system')
	const [resolved, setResolved] = useState<'light' | 'dark'>('light')

	useEffect(() => {
		const stored = (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? 'system'
		setMode(stored)
	}, [])

	useEffect(() => {
		const root = document.documentElement
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
		function apply(m: Mode) {
			root.classList.remove('light', 'dark')
			if (m === 'system') {
				setResolved(prefersDark.matches ? 'dark' : 'light')
			} else {
				root.classList.add(m)
				setResolved(m)
			}
		}
		apply(mode)
		const onChange = () => mode === 'system' && apply('system')
		prefersDark.addEventListener('change', onChange)
		return () => prefersDark.removeEventListener('change', onChange)
	}, [mode])

	function cycle() {
		const next: Mode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
		setMode(next)
		localStorage.setItem(STORAGE_KEY, next)
	}

	const label = mode === 'system' ? 'System theme' : mode === 'light' ? 'Light theme' : 'Dark theme'

	return (
		<button
			type='button'
			onClick={cycle}
			aria-label={`Toggle theme (current: ${label})`}
			title={label}
			className='inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground'
		>
			{mode === 'system' ? (
				<MonitorIcon />
			) : resolved === 'dark' ? (
				<MoonIcon />
			) : (
				<SunIcon />
			)}
		</button>
	)
}

function SunIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<circle cx='8' cy='8' r='3' stroke='currentColor' strokeWidth='1.5' />
			<path d='M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
		</svg>
	)
}
function MoonIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<path d='M13.5 9.5A6 6 0 016.5 2.5a6 6 0 107 7z' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
		</svg>
	)
}
function MonitorIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
			<rect x='1.5' y='2.5' width='13' height='9' rx='1.5' stroke='currentColor' strokeWidth='1.5' />
			<path d='M5 14h6M8 11.5V14' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
		</svg>
	)
}
