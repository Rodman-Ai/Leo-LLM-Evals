import { PageHeader } from '@/components/PageHeader'
import { SuiteCreateForms } from '@/components/SuiteCreateForms'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'New suite · evalbench',
	description: 'Create a new suite manually or import a suite definition from a JSON file.',
}

export default function NewSuitePage() {
	return (
		<div className='mx-auto max-w-2xl space-y-6'>
			<PageHeader
				title='New suite'
				crumbs={[{ label: 'Suites', href: '/suites' }, { label: 'New' }]}
				description='Create a metadata-only suite or import a JSON file with cases attached.'
				actions={
					<a
						href='/api/suites/template.json'
						download
						className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
					>
						<svg
							width='14'
							height='14'
							viewBox='0 0 14 14'
							fill='none'
							aria-hidden='true'
						>
							<path
								d='M7 1.5v8m-3-3l3 3 3-3M2 12.5h10'
								stroke='currentColor'
								strokeWidth='1.5'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
						Template JSON
					</a>
				}
			/>
			<div className='rounded-xl border border-border bg-card p-6'>
				<SuiteCreateForms />
			</div>
		</div>
	)
}
