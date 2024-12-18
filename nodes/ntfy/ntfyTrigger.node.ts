import { EventSource, ErrorEvent } from 'eventsource';

import type {
	IDataObject,
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionType, jsonParse } from 'n8n-workflow';

export class NtfyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ntfy Trigger',
		name: 'ntfyTrigger',
		icon: 'file:ntfy.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when ntfy Server-Sent Events occur',
		eventTriggerDescription: '',
		activationMessage: 'You can now send messages to your nfty server to trigger executions.',
		defaults: {
			name: 'ntfy Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'ntfyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Topic(s)',
				name: 'topics',
				placeholder: 'Add Topic',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: 'List of topics to listen to',
				options: [
					{
						displayName: 'Topic',
						name: 'choices',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// Retrieve the credentials
		const credentials = (await this.getCredentials('ntfyApi')) as {
			host: string;
			token: string;
		};

		const { host, token } = credentials;

		const topics = this.getNodeParameter('topics', []) as {
			choices: {
				name: { value: string };
			}[];
		};

		// Extract the topic values into an array
		const authToken = Buffer.from(`Bearer ${token}`).toString('base64');

		// Keep track of eventSources
		const eventSources: EventSource[] = [];

		const closeFunction = async () => {
			this.logger.debug('Closing EventSource connections.');
			for (const eventSource of eventSources) {
				eventSource.close();
			}
		};

		for (let i = 0; i < topics.choices.length; i++) {
			const topic = topics.choices[i].name;
			let url = `${host}/${topic}/sse?auth=${authToken}`;

			this.logger.debug(`Subscribing to ${url}`);

			const eventSource = new EventSource(url);

			eventSource.onmessage = async (event: MessageEvent) => {
				try {
					const eventData = jsonParse<IDataObject>(event.data as string, {
						errorMessage: 'Invalid JSON for event data',
					});
					this.emit([this.helpers.returnJsonArray([eventData])]);
				} catch (error) {
					this.logger.error(`Failed to parse event data: ${error}`);
				}
			};

			eventSource.onerror = (error: ErrorEvent) => {
				this.logger.error(`EventSource error on topic "${topic}": ${error}`);
			};

			eventSources.push(eventSource);
		}

		return {
			closeFunction,
		};
	}
}
