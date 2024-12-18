import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

enum Priority {
	Min = 1,
	Low = 2,
	Default = 3,
	High = 4,
	Urgent = 5,
}

/**
 * Keep class name in lowercases so n8n can require() it....
 */
export class ntfy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ntfy',
		name: 'ntfy',
		icon: 'file:ntfy.svg',
		group: ['transform'],
		version: 1,
		description: 'Send message to a topic in a NTFY server',
		defaults: {
			name: 'ntfy',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'ntfyApi',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			// There is only a single resource and operation (send notification).
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: Priority.Default,
				noDataExpression: true,
				options: Object.keys(Priority)
					.filter((p) => isNaN(parseInt(p, 10)))
					.map((pStr) => ({
						name: pStr,
						value: Priority[pStr as unknown as Priority],
					})),
			},
			{
				displayName: 'Use Markdown',
				name: 'markdown',
				type: 'boolean',
				default: true,
				noDataExpression: true,
			},
			{
				displayName: 'Click URL',
				name: 'click',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// For each item, make an API call
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			// let item: INodeExecutionData = items[i];

			const body = {
				topic: this.getNodeParameter('topic', itemIndex) as string,
				message: this.getNodeParameter('message', itemIndex) as string,
				title: this.getNodeParameter('title', itemIndex) as string,
				priority: this.getNodeParameter('priority', itemIndex) as string,
				click: this.getNodeParameter('click', itemIndex) as string,
				tags: this.getNodeParameter('tags', itemIndex)?.toString().replace(/\s/, '').split(','),
				markdown: this.getNodeParameter('markdown', itemIndex) as boolean,
			};

			// Retrieve the credentials
			const credentials = (await this.getCredentials('ntfyApi', itemIndex)) as {
				host: string;
				token: string;
			};

			const { host, token } = credentials;

			const options: IHttpRequestOptions = {
				method: 'POST',
				url: host,
				json: true,
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body,
			};

			console.log('Host', host);
			console.log(options);

			try {
				const responseData = await this.helpers.httpRequest(options);

				returnData.push({ json: responseData });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: this.getInputData(itemIndex)[0].json,
						error,
						pairedItem: itemIndex,
					});
					continue;
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
