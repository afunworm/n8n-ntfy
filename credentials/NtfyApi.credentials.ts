import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * For God Knows Why's reason, the class name has to end in a case
 * sensitve "Api"
 * Also everything must be Api so lint can pass it
 * File name must also be Api for build time
 * It's better to just stick with their conventions:
 *     - Capitalized for file names & class names
 *     - lowerCase (or camel) for module name
 */
export class ntfyApi implements ICredentialType {
	name = 'ntfyApi';
	displayName = 'ntfy';
	documentationUrl = 'https://docs.ntfy.sh/publish/#authentication';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'https://ntfy.sh',
		},
		{
			displayName: 'Authorization Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate = {
		type: 'generic',
		properties: {
			header: {
				Authorization: `=Bearer {{$credentials.token}}`,
			},
		},
	} as IAuthenticateGeneric;
}
