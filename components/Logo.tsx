/**
 * Stacked-bars mark — nods to the leaderboard nature of the app.
 * Three bars of decreasing length with the top bar in brand color.
 *
 * `size` controls the icon mark; the wordmark uses inherited font size.
 */
export function Logo({ size = 20, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
	return (
		<span className='inline-flex items-center gap-2 font-semibold tracking-tight'>
			<svg
				width={size}
				height={size}
				viewBox='0 0 20 20'
				fill='none'
				aria-hidden='true'
				className='shrink-0'
			>
				<rect x='2' y='4' width='16' height='3' rx='1' fill='hsl(var(--brand))' />
				<rect x='2' y='8.5' width='12' height='3' rx='1' className='fill-foreground/85' />
				<rect x='2' y='13' width='8' height='3' rx='1' className='fill-foreground/55' />
			</svg>
			{withWordmark && <span>evalbench</span>}
		</span>
	)
}

export function LogoLarge() {
	return (
		<span className='inline-flex items-center gap-3'>
			<svg width='52' height='52' viewBox='0 0 20 20' fill='none' aria-hidden='true'>
				<rect x='2' y='4' width='16' height='3' rx='1' fill='hsl(var(--brand))' />
				<rect x='2' y='8.5' width='12' height='3' rx='1' className='fill-foreground/85' />
				<rect x='2' y='13' width='8' height='3' rx='1' className='fill-foreground/55' />
			</svg>
			<span className='text-3xl font-semibold tracking-tight'>evalbench</span>
		</span>
	)
}
