/**
 * Hand-written OpenAPI 3.1 spec. ~10 endpoints isn't enough surface to
 * justify a Zod-to-OpenAPI build step; this is more direct and gives
 * full control over examples + the OpenAPI 3.1 `webhooks` section.
 */

const errorEnvelope = {
	type: 'object',
	required: ['error', 'code'],
	properties: {
		error: { type: 'string' },
		code: { type: 'string' },
		details: {},
	},
} as const

const errorResponses = {
	'400': {
		description: 'Invalid request',
		content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
	},
	'404': {
		description: 'Not found',
		content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
	},
	'500': {
		description: 'Internal error',
		content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
	},
} as const

export function getOpenApiSpec(origin: string) {
	return {
		openapi: '3.1.0',
		info: {
			title: 'evalbench API',
			version: '0.1.0',
			description:
				'Public read API + webhook configuration for evalbench. ' +
				'Run-triggering endpoints (`POST /api/runs`) and SSE streaming are deferred to a later release.',
			license: { name: 'MIT' },
		},
		servers: [{ url: origin, description: 'this deployment' }],
		paths: {
			'/api/suites': {
				get: {
					summary: 'List suites',
					description: 'Returns every persisted suite with summary stats (run count, latest pass rate).',
					operationId: 'listSuites',
					tags: ['Suites'],
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											suites: {
												type: 'array',
												items: { $ref: '#/components/schemas/SuiteSummary' },
											},
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/runs': {
				get: {
					summary: 'List runs',
					description: 'Recent runs across all suites, optionally filtered by suite.',
					operationId: 'listRuns',
					tags: ['Runs'],
					parameters: [
						{
							name: 'suite',
							in: 'query',
							required: false,
							schema: { type: 'string' },
							example: 'code-review',
						},
						{
							name: 'limit',
							in: 'query',
							required: false,
							schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
						},
					],
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											runs: { type: 'array', items: { $ref: '#/components/schemas/RunSummary' } },
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/runs/{id}': {
				get: {
					summary: 'Get run + results',
					operationId: 'getRun',
					tags: ['Runs'],
					parameters: [
						{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
					],
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											run: { $ref: '#/components/schemas/RunDetail' },
											results: {
												type: 'array',
												items: { $ref: '#/components/schemas/RunResult' },
											},
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/leaderboard/{name}': {
				get: {
					summary: 'Get leaderboard for a suite',
					operationId: 'getLeaderboard',
					tags: ['Leaderboard'],
					parameters: [
						{
							name: 'name',
							in: 'path',
							required: true,
							schema: { type: 'string' },
							example: 'code-review',
						},
					],
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											suite: { $ref: '#/components/schemas/Suite' },
											entries: {
												type: 'array',
												items: { $ref: '#/components/schemas/LeaderboardEntry' },
											},
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/webhooks': {
				get: {
					summary: 'List configured webhooks',
					description:
						'One row per supported event. Rows that have not been configured yet have `id=null` and `enabled=false`.',
					operationId: 'listWebhooks',
					tags: ['Webhooks'],
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											webhooks: {
												type: 'array',
												items: { $ref: '#/components/schemas/Webhook' },
											},
											supportedEvents: {
												type: 'array',
												items: { type: 'string' },
												example: ['run.completed', 'regression.detected'],
											},
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/webhooks/{event}': {
				put: {
					summary: 'Configure a webhook',
					description:
						'Upserts the configuration for the given event. URL must be a fully-qualified https URL or `null` to clear.',
					operationId: 'setWebhook',
					tags: ['Webhooks'],
					parameters: [
						{
							name: 'event',
							in: 'path',
							required: true,
							schema: { type: 'string', enum: ['run.completed', 'regression.detected'] },
						},
					],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/WebhookConfigInput' },
								example: {
									url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX',
									enabled: true,
									secret: 'replace-with-strong-secret',
								},
							},
						},
					},
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: { webhook: { $ref: '#/components/schemas/Webhook' } },
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/webhooks/{event}/test': {
				post: {
					summary: 'Send a synthetic delivery to test the configured URL',
					description:
						'Fires the webhook with a fixture payload representative of a real delivery. Records the attempt in `webhook_deliveries`. `force=true` is implied — disabled webhooks still fire.',
					operationId: 'testWebhook',
					tags: ['Webhooks'],
					parameters: [
						{
							name: 'event',
							in: 'path',
							required: true,
							schema: { type: 'string', enum: ['run.completed', 'regression.detected'] },
						},
					],
					responses: {
						'200': {
							description: 'OK — delivery attempted (succeeded or failed; see `delivery.succeeded`)',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											delivery: { $ref: '#/components/schemas/WebhookDelivery' },
											payload: { type: 'object' },
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
			'/api/webhooks/{event}/deliveries': {
				get: {
					summary: 'List recent delivery attempts for an event',
					operationId: 'listWebhookDeliveries',
					tags: ['Webhooks'],
					parameters: [
						{
							name: 'event',
							in: 'path',
							required: true,
							schema: { type: 'string', enum: ['run.completed', 'regression.detected'] },
						},
						{
							name: 'limit',
							in: 'query',
							required: false,
							schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
						},
					],
					responses: {
						'200': {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											deliveries: {
												type: 'array',
												items: { $ref: '#/components/schemas/WebhookDelivery' },
											},
										},
									},
								},
							},
						},
						...errorResponses,
					},
				},
			},
		},
		webhooks: {
			'run.completed': {
				post: {
					summary: 'Fired after every successful run completion',
					description:
						'Sent to your configured URL. Headers include `X-Evalbench-Event`, `X-Evalbench-Delivery-Id`, and (if a secret is set) `X-Evalbench-Signature: sha256=<hmac>`.',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RunCompletedPayload' },
								example: {
									event: 'run.completed',
									timestamp: '2026-05-04T10:30:00Z',
									runId: 1234,
									suiteName: 'code-review',
									model: 'anthropic:claude-haiku-4-5',
									passed: 47,
									total: 53,
									passRate: 0.8867924528301887,
									costCents: 255,
									avgLatencyMs: 642,
									dashboardUrl: 'https://evalbench.example.com/runs/1234',
								},
							},
						},
					},
					responses: { '2XX': { description: 'Acknowledge receipt' } },
				},
			},
			'regression.detected': {
				post: {
					summary: 'Fired after run.completed when pass rate drops vs. the prior run',
					description:
						'Compares the just-completed run to the most recent prior `complete` run for the same `(suite, model)`. Fires only when `delta < 0`.',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RegressionDetectedPayload' },
								example: {
									event: 'regression.detected',
									timestamp: '2026-05-04T10:30:00Z',
									runId: 1234,
									suiteName: 'code-review',
									model: 'anthropic:claude-haiku-4-5',
									currentPassRate: 0.7547169811320755,
									previousPassRate: 0.8867924528301887,
									delta: -0.1320754716981132,
									previousRunId: 1230,
									dashboardUrl: 'https://evalbench.example.com/compare?a=1230&b=1234',
								},
							},
						},
					},
					responses: { '2XX': { description: 'Acknowledge receipt' } },
				},
			},
		},
		components: {
			schemas: {
				Error: errorEnvelope,
				SuiteSummary: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						name: { type: 'string' },
						description: { type: ['string', 'null'] },
						tags: { type: 'array', items: { type: 'string' } },
						runCount: { type: 'integer' },
						lastRunAt: { type: ['string', 'null'], format: 'date-time' },
						latestPassRate: { type: ['number', 'null'] },
					},
				},
				Suite: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						name: { type: 'string' },
						description: { type: ['string', 'null'] },
					},
				},
				RunSummary: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						suiteId: { type: 'integer' },
						suiteName: { type: 'string' },
						model: { type: 'string' },
						status: { type: 'string', enum: ['running', 'complete', 'error'] },
						startedAt: { type: 'string', format: 'date-time' },
						finishedAt: { type: ['string', 'null'], format: 'date-time' },
						gitSha: { type: ['string', 'null'] },
						gitBranch: { type: ['string', 'null'] },
						total: { type: 'integer' },
						passed: { type: 'integer' },
						costCents: { type: 'integer' },
						avgLatencyMs: { type: 'integer' },
					},
				},
				RunDetail: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						suiteId: { type: 'integer' },
						suiteName: { type: 'string' },
						model: { type: 'string' },
						status: { type: 'string' },
						promptText: { type: 'string' },
						startedAt: { type: 'string', format: 'date-time' },
						finishedAt: { type: ['string', 'null'], format: 'date-time' },
						gitSha: { type: ['string', 'null'] },
						gitBranch: { type: ['string', 'null'] },
						triggeredBy: { type: ['string', 'null'] },
						notes: { type: ['string', 'null'] },
					},
				},
				RunResult: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						input: { type: 'string' },
						expected: { type: ['string', 'null'] },
						output: { type: ['string', 'null'] },
						passed: { type: 'boolean' },
						costCents: { type: 'integer' },
						latencyMs: { type: 'integer' },
						inputTokens: { type: 'integer' },
						outputTokens: { type: 'integer' },
						scores: { type: 'array', items: { type: 'object' } },
						errorMessage: { type: ['string', 'null'] },
					},
				},
				LeaderboardEntry: {
					type: 'object',
					properties: {
						model: { type: 'string' },
						runs: { type: 'integer' },
						latestRunId: { type: 'integer' },
						latestStartedAt: { type: 'string', format: 'date-time' },
						total: { type: 'integer' },
						passed: { type: 'integer' },
						avgCostCents: { type: 'integer' },
						avgLatencyMs: { type: 'integer' },
					},
				},
				Webhook: {
					type: 'object',
					properties: {
						id: { type: ['integer', 'null'] },
						event: { type: 'string' },
						url: { type: ['string', 'null'] },
						enabled: { type: 'boolean' },
						secret: { type: ['string', 'null'] },
						createdAt: { type: ['string', 'null'], format: 'date-time' },
						updatedAt: { type: ['string', 'null'], format: 'date-time' },
					},
				},
				WebhookConfigInput: {
					type: 'object',
					required: ['url', 'enabled'],
					properties: {
						url: { type: ['string', 'null'], format: 'uri' },
						enabled: { type: 'boolean' },
						secret: { type: ['string', 'null'], minLength: 8 },
					},
				},
				WebhookDelivery: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						webhookId: { type: 'integer' },
						event: { type: 'string' },
						payload: { type: 'object' },
						statusCode: { type: ['integer', 'null'] },
						responseBody: { type: ['string', 'null'] },
						succeeded: { type: 'boolean' },
						errorMessage: { type: ['string', 'null'] },
						durationMs: { type: ['integer', 'null'] },
						attemptedAt: { type: 'string', format: 'date-time' },
					},
				},
				RunCompletedPayload: {
					type: 'object',
					required: ['event', 'timestamp', 'runId', 'suiteName', 'model', 'passed', 'total'],
					properties: {
						event: { type: 'string', enum: ['run.completed'] },
						timestamp: { type: 'string', format: 'date-time' },
						runId: { type: 'integer' },
						suiteName: { type: 'string' },
						model: { type: 'string' },
						passed: { type: 'integer' },
						total: { type: 'integer' },
						passRate: { type: 'number' },
						costCents: { type: 'integer' },
						avgLatencyMs: { type: 'integer' },
						dashboardUrl: { type: ['string', 'null'] },
					},
				},
				RegressionDetectedPayload: {
					type: 'object',
					required: ['event', 'timestamp', 'runId', 'suiteName', 'model', 'currentPassRate', 'previousPassRate', 'delta', 'previousRunId'],
					properties: {
						event: { type: 'string', enum: ['regression.detected'] },
						timestamp: { type: 'string', format: 'date-time' },
						runId: { type: 'integer' },
						suiteName: { type: 'string' },
						model: { type: 'string' },
						currentPassRate: { type: 'number' },
						previousPassRate: { type: 'number' },
						delta: { type: 'number' },
						previousRunId: { type: 'integer' },
						dashboardUrl: { type: ['string', 'null'] },
					},
				},
			},
		},
	} as const
}

export type OpenApiSpec = ReturnType<typeof getOpenApiSpec>
