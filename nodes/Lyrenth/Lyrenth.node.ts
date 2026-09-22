import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

/*
	Declarative node. Every operation is one HTTP call described in `routing`,
	so there is no execute() to keep in step with the API.

	The three calls, and the response each one returns:

	  Page: Read       POST /v1/aidocument        one AIDocument (JSON)
	  Page: Read Many  POST /v1/aidocument/batch  { results: [...] }, one entry per URL
	  Account: Quota   GET  /v1/quota             the account's reads used, limit and reset

	Field names below are the ones the API actually sends. The AIDocument
	envelope groups them: source, cache, identity, content, structure, signals,
	economics. "Markdown Only" reads content.markdown out of that envelope.
*/

export class Lyrenth implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lyrenth',
		name: 'lyrenth',
		icon: { light: 'file:lyrenth.svg', dark: 'file:lyrenth.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read any public web page as a clean AIDocument',
		defaults: {
			name: 'Lyrenth',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'lyrenthApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.lyrenth.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Page',
						value: 'page',
					},
				],
				default: 'page',
			},

			// Page operations.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['page'],
					},
				},
				options: [
					{
						name: 'Read',
						value: 'read',
						action: 'Read a page',
						description: 'Turn one URL into a clean AIDocument',
						routing: {
							request: {
								method: 'POST',
								url: '/v1/aidocument',
							},
						},
					},
					{
						name: 'Read Many',
						value: 'readMany',
						action: 'Read many pages',
						description: 'Turn up to 20 URLs into AIDocuments, one output item per URL',
						routing: {
							request: {
								method: 'POST',
								url: '/v1/aidocument/batch',
							},
							output: {
								// The batch answers { "results": [ ... ] }, one entry per URL,
								// each carrying its own ok flag and, on a failure, the status,
								// error, message and upstream_status for that URL alone. Hoisting
								// the array gives one n8n item per URL and keeps those per-URL
								// failures as data, so one unreachable page never loses the rest.
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'results',
										},
									},
								],
							},
						},
					},
				],
				default: 'read',
			},

			// Account operations.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Get Quota',
						value: 'getQuota',
						action: 'Get quota',
						description: 'Retrieve the reads used, the limit and when the period resets',
						routing: {
							request: {
								method: 'GET',
								url: '/v1/quota',
							},
						},
					},
				],
				default: 'getQuota',
			},

			// Page: Read.
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. https://example.com/article',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['read'],
					},
				},
				description: 'The page to read. Must be an http or https URL.',
				routing: {
					request: {
						body: {
							url: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Markdown Only',
				name: 'markdownOnly',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['read'],
					},
				},
				description:
					'Whether to return only the title and the Markdown body instead of the whole AIDocument',
				routing: {
					output: {
						// Reduces the envelope to the three fields a text step needs. The
						// call is the same one either way, so turning this on changes what
						// the node hands to the next step, nothing else.
						postReceive: [
							{
								type: 'set',
								enabled: '={{ $value }}',
								properties: {
									value:
										'={{ { "url": $response.body.source.url, "title": $response.body.identity.title, "markdown": $response.body.content.markdown } }}',
								},
							},
						],
					},
				},
			},

			// Page: Read Many.
			{
				displayName: 'URLs',
				name: 'urls',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'e.g. https://example.com/a',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['readMany'],
					},
				},
				description: 'The pages to read, one URL per line or separated by commas. Up to 20 per call: a longer list is refused with a message naming the limit, so no URL is dropped in silence.',
				routing: {
					request: {
						body: {
							urls: '={{ $value.split(/[\\n,]+/).map((u) => u.trim()).filter((u) => u.length > 0) }}',
						},
					},
				},
			},

			// Options shared by both read operations. Declared twice because each
			// operation sends them on its own request.
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['read'],
					},
				},
				options: [
					{
						displayName: 'Freshness',
						name: 'freshnessPolicy',
						type: 'options',
						default: 'cache_first',
						description: 'How recent the copy has to be',
						options: [
							{
								name: 'Cache First',
								value: 'cache_first',
								description: 'Serve the stored copy while it is inside the freshness window',
							},
							{
								name: 'Force Refresh',
								value: 'force_refresh',
								description: 'Skip the stored copy and crawl the page now',
							},
						],
						routing: {
							request: {
								body: {
									freshness_policy: '={{ $value }}',
								},
							},
						},
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 4000,
						typeOptions: {
							minValue: 1,
						},
						description: 'Cap the Markdown at roughly this many tokens, trimmed at a clean paragraph or sentence boundary. Leave the option off for the whole page.',
						routing: {
							request: {
								body: {
									max_tokens: '={{ $value }}',
								},
							},
						},
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['readMany'],
					},
				},
				options: [
					{
						displayName: 'Freshness',
						name: 'freshnessPolicy',
						type: 'options',
						default: 'cache_first',
						description: 'How recent the copies have to be. Applies to every URL in the call.',
						options: [
							{
								name: 'Cache First',
								value: 'cache_first',
								description: 'Serve the stored copy while it is inside the freshness window',
							},
							{
								name: 'Force Refresh',
								value: 'force_refresh',
								description: 'Skip the stored copy and crawl every page now',
							},
						],
						routing: {
							request: {
								body: {
									freshness_policy: '={{ $value }}',
								},
							},
						},
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 4000,
						typeOptions: {
							minValue: 1,
						},
						description:
							'Cap each returned document at roughly this many tokens, trimmed at a clean paragraph or sentence boundary',
						routing: {
							request: {
								body: {
									max_tokens: '={{ $value }}',
								},
							},
						},
					},
				],
			},
		],
	};
}
