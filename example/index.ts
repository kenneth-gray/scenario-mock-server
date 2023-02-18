import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import z from 'zod';

const userSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	marketingPreferences: z.array(z.string()),
});

const usersSchema = z.array(userSchema);

import { run } from '../src';

const schema = fs.readFileSync(path.join(__dirname, './schema.gql'), {
	encoding: 'utf8',
});

run({
	scenarios: {
		default: {
			context: {
				// a: 1,
				// b: 2,
				// c: 3,
				users: [
					{
						id: 'c2fd1540-4c49-58fa-aaad-536e82f87f13',
						name: 'Jesse Lawrence',
						email: 'jesse.lawrence@example.com',
						marketingPreferences: ['EMAIL'],
					},
					{
						id: '5bf5edd2-a595-5601-9206-ee7427234970',
						name: 'Johanna Rivera',
						email: 'johanna.rivera@example.com',
						marketingPreferences: ['EMAIL', 'POST'],
					},
				],
			},
			mocks: [
				{
					url: '/api/test-me',
					method: 'GET',
					response: { data: { blue: 'yoyo' } },
				},
				{
					url: '/api/return/:someId',
					method: 'GET',
					response: ({ query, params }) => {
						return {
							data: {
								query,
								params,
							},
						};
					},
				},
				{
					url: '/api/return/:someId',
					method: 'POST',
					response: async ({ body, params }) => {
						return {
							data: {
								body,
								params,
							},
						};
					},
				},
				{
					url: '/api/graphql',
					method: 'GRAPHQL',
					schema,
					// TODO: Is this right? Current thoughts are no...
					// context: {},
					queries: {
						version: {
							data: '1.0',
						},
						version2: ({ operationName }) => {
							return {
								data: {
									operation: `Operation name: ${operationName}`,
								},
								delay: 2000,
							};
						},
						version3: {
							data: {
								data: ({ operationName }) => {
									throw new Error(`Internal error: ${operationName}`);
								},
							},
							delay: 2000,
						},
						version4: ({ operationName }) => ({
							status: 500,
							data: `Internal error: ${operationName}`,
							delay: 2000,
						}),
						version5: ({ operationName }) => ({
							data: {
								errors: [{ message: `Something went wrong: ${operationName}` }],
							},
						}),
						test: {
							data: {
								data: async () => ({
									a: 1,
									b: async () => 2,
									c: 3,
								}),
							},
						},
						user: ({ variables, context }) => {
							console.dir(
								{ name: 'user fn', variables, context },
								{ depth: null },
							);

							const users = usersSchema.parse(context.users);
							const user = users.find(({ id }) => variables.id === id);

							// Returning undefined will result in using the default type if it exists
							return {
								data: user,
								delay: 1000,
							};
						},
						users: ({ context }) => {
							console.dir({ name: 'users fn', context }, { depth: null });

							const users = usersSchema.parse(context?.users);

							return {
								data: users,
							};
						},
					},
					mutations: {
						createUser: ({ variables, updateContext, context }) => {
							const users = usersSchema.parse(context?.users);

							// TODO: Schema check variables
							const user = userSchema
								.partial({ marketingPreferences: true })
								.pick({ name: true, email: true, marketingPreferences: true })
								.parse(variables.user);

							const newUser = {
								id: randomUUID(),
								name: user.name,
								email: user.email,
								marketingPreferences: user.marketingPreferences || [],
							};

							const newUsers = [...users, newUser];

							updateContext({ users: newUsers });

							return {
								data: user,
							};
						},
					},
					types: {
						User: {
							id: ({ variables }) =>
								typeof variables.id === 'string' ? variables.id : randomUUID(),
							name: 'Bob',
							email: 'Jones',
							// Auto generate marketing preferences
						},
					},
					// operations: [
					// 	{
					// 		type: 'query',
					// 		name: 'Cheese',
					// 		response: {
					// 			data: {
					// 				data: {
					// 					name: 'Cheddar',
					// 				},
					// 			},
					// 		},
					// 	},
					// 	{
					// 		type: 'query',
					// 		name: 'Bread',
					// 		response: {
					// 			data: {
					// 				data: {
					// 					name: 'Bread Roll',
					// 				},
					// 			},
					// 		},
					// 	},
					// ],
				},
				// {
				// 	url: '/api/graphql-function',
				// 	method: 'GRAPHQL',
				// 	operations: [
				// 		{
				// 			type: 'query',
				// 			name: 'Function',
				// 			response: async ({ variables }) => {
				// 				return {
				// 					data: {
				// 						data: {
				// 							variables,
				// 						},
				// 					},
				// 				};
				// 			},
				// 		},
				// 	],
				// },
				{
					url: '/api/context',
					method: 'GET',
					response: ({ context }) => ({ data: context }),
				},
				{
					url: '/api/context',
					method: 'PUT',
					response: ({ body, updateContext }) => ({
						data: updateContext(body),
					}),
				},
			],
		},
		blueCheese: {
			name: 'Blue cheese',
			mocks: [
				{
					url: '/api/test-me',
					method: 'GET',
					response: { data: { blue: 'cheese' } },
				},
				// {
				// 	url: '/api/graphql',
				// 	method: 'GRAPHQL',
				// 	operations: [
				// 		{
				// 			type: 'query',
				// 			name: 'Cheese',
				// 			response: {
				// 				data: {
				// 					data: {
				// 						name: 'Blue Cheese',
				// 					},
				// 				},
				// 			},
				// 		},
				// 	],
				// },
			],
		},
		redCheese: {
			name: 'Red cheese',
			mocks: [
				{
					url: '/api/test-me',
					method: 'GET',
					response: { data: { red: 'leicester' } },
				},
				// {
				// 	url: '/api/graphql',
				// 	method: 'GRAPHQL',
				// 	operations: [
				// 		{
				// 			type: 'query',
				// 			name: 'Cheese',
				// 			response: {
				// 				data: {
				// 					data: {
				// 						name: 'Red Leicester',
				// 					},
				// 				},
				// 			},
				// 		},
				// 	],
				// },
			],
		},
		tigerBread: {
			name: 'Tiger bread',
			extend: 'default',
			mocks: [],
		},
		baguette: {
			name: 'Baguette',
			extend: 'default',
			mocks: [],
		},
		fish: {
			name: 'Fish',
			extend: 'default',
			mocks: [
				{
					url: '/api/test-me-2',
					method: 'GET',
					response: { data: { blue: 'tang' } },
				},
			],
		},
		water: {
			name: 'Water',
			extend: 'default',
			mocks: [],
		},
	},
	options: {
		port: 5000,
		uiPath: '/scenarios-ui',
		selectScenarioPath: '/select',
		// cookieMode: true,
	},
});
