import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class LyrenthApi implements ICredentialType {
	name = 'lyrenthApi';

	displayName = 'Lyrenth API';

	icon: Icon = {
		light: 'file:../nodes/Lyrenth/lyrenth.svg',
		dark: 'file:../nodes/Lyrenth/lyrenth.dark.svg',
	};

	documentationUrl = 'https://lyrenth.com/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'e.g. aiwk_0123456789abcdef',
			description:
				'Your Lyrenth API key. Sign up at https://lyrenth.com/signup and create a key at https://lyrenth.com/dashboard/keys',
		},
	];

	// The key travels as a bearer token on every call.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// GET /v1/quota is the cheapest authenticated call: it reports the account
	// state and reads no page, so testing a key costs the account nothing.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.lyrenth.com',
			url: '/v1/quota',
			method: 'GET',
		},
	};
}
