import Script from 'next/script'

export const metadata = {
	title: 'API · evalbench',
	description: 'OpenAPI reference for the evalbench HTTP API and webhooks.',
}

export default function ApiDocsPage() {
	return (
		<div className='-mx-6 -my-8'>
			<link rel='stylesheet' href='https://unpkg.com/swagger-ui-dist@5/swagger-ui.css' />
			<style>{`
				/* Tighten Swagger's defaults so it sits in the dashboard chrome. */
				.swagger-ui .topbar { display: none; }
				.swagger-ui { font-family: inherit; padding: 0 24px; }
				.swagger-ui .info { margin: 32px 0 24px; }
			`}</style>
			<div id='swagger-ui' />
			<Script
				src='https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
				strategy='afterInteractive'
			/>
			<Script
				id='swagger-init'
				strategy='afterInteractive'
				dangerouslySetInnerHTML={{
					__html: `
						(function init(retries) {
							if (typeof window.SwaggerUIBundle !== 'function') {
								if (retries > 0) return setTimeout(function () { init(retries - 1) }, 100)
								return
							}
							window.ui = window.SwaggerUIBundle({
								url: '/api/openapi.json',
								dom_id: '#swagger-ui',
								deepLinking: true,
								tryItOutEnabled: true,
								filter: true,
								displayRequestDuration: true,
							})
						})(50)
					`,
				}}
			/>
		</div>
	)
}
