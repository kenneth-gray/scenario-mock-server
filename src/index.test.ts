/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServerWithKill } from 'server-with-kill';
import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

import { run } from './index';

describe('run', () => {
	describe('port', () => {
		it('defaults to 3000', async () => {
			const server = run({
				scenarios: { test: [] },
			});

			await serverTest(server, () => {
				const address = server.address();
				const port =
					!!address && typeof address !== 'string' ? address.port : 0;

				expect(port).toEqual(3000);
			});
		});

		it('can be set using options', async () => {
			const expectedPort = 5000;
			const server = run({
				scenarios: { test: [] },
				options: { port: expectedPort },
			});

			await serverTest(server, () => {
				const address = server.address();
				const port =
					!!address && typeof address !== 'string' ? address.port : 0;

				expect(port).toEqual(expectedPort);
			});
		});
	});

	describe('headers', () => {
		it('Access-Control-Allow-Credentials set to true', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/test-me',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/test-me');

				expect(
					response.headers.get('access-control-allow-credentials'),
				).toEqual('true');
			});
		});

		it('Access-Control-Allow-Origin set to *', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/test-me',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/test-me');

				expect(response.headers.get('access-control-allow-origin')).toEqual(
					'*',
				);
			});
		});
	});

	describe('mocks', () => {
		it('respond as expected', async () => {
			const expectedGetResponse = { get: 'food' };
			const expectedPostResponse = { post: 'mail' };
			const expectedPutResponse = { put: 'it down' };
			const expectedDeleteResponse = { delete: 'program' };
			const expectedPatchResponse = { patch: 'it' };

			const server = run({
				scenarios: {
					test: [
						{
							url: '/test-me',
							method: 'GET',
							response: { data: expectedGetResponse },
						},
						{
							url: '/test-me',
							method: 'POST',
							response: { data: expectedPostResponse },
						},
						{
							url: '/test-me',
							method: 'PUT',
							response: { data: expectedPutResponse },
						},
						{
							url: '/test-me',
							method: 'DELETE',
							response: { data: expectedDeleteResponse },
						},
						{
							url: '/test-me',
							method: 'PATCH',
							response: { data: expectedPatchResponse },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const [
					getResponse,
					postResponse,
					putResponse,
					deleteResponse,
					patchResponse,
				] = await Promise.all([
					fetch('http://localhost:3000/test-me').then((res) => res.json()),
					fetch('http://localhost:3000/test-me', { method: 'POST' }).then(
						(res) => res.json(),
					),
					fetch('http://localhost:3000/test-me', { method: 'PUT' }).then(
						(res) => res.json(),
					),
					fetch('http://localhost:3000/test-me', { method: 'DELETE' }).then(
						(res) => res.json(),
					),
					fetch('http://localhost:3000/test-me', { method: 'PATCH' }).then(
						(res) => res.json(),
					),
				]);

				expect(getResponse).toEqual(expectedGetResponse);
				expect(postResponse).toEqual(expectedPostResponse);
				expect(putResponse).toEqual(expectedPutResponse);
				expect(deleteResponse).toEqual(expectedDeleteResponse);
				expect(patchResponse).toEqual(expectedPatchResponse);
			});
		});

		it('delayed responses work', async () => {
			const responseDelay = 500;
			const server = run({
				scenarios: {
					test: [
						{
							url: '/test-me',
							method: 'GET',
							response: {
								delay: responseDelay,
							},
						},
					],
				},
			});

			await serverTest(server, async () => {
				const startTime = getStartTime();

				await fetch('http://localhost:3000/test-me');

				const duration = getDuration(startTime);

				expect(duration).toBeGreaterThanOrEqual(responseDelay);
			});
		});

		it('can use functions for responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/test-function/:id',
							method: 'POST',
							response: ({ body, query, params }) => ({
								data: {
									body,
									query,
									params,
								},
							}),
						},
					],
				},
			});

			await serverTest(server, async () => {
				const id = 'some-id';
				const testQuery = 'test-query';
				const body = { some: 'body' };
				const response = await fetch(
					`http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(body),
					},
				).then((res) => res.json());

				expect(response).toEqual({
					body,
					query: {
						testQuery,
					},
					params: { id },
				});
			});
		});

		it('can use async functions for responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/test-function/:id',
							method: 'POST',
							response: async ({ body, query, params }) => ({
								data: {
									body,
									query,
									params,
								},
							}),
						},
					],
				},
			});

			await serverTest(server, async () => {
				const id = 'some-id';
				const testQuery = 'test-query';
				const body = { some: 'body' };
				const response = await fetch(
					`http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(body),
					},
				).then((res) => res.json());

				expect(response).toEqual({
					body,
					query: {
						testQuery,
					},
					params: { id },
				});
			});
		});

		// TODO: GraphQL
		// it('supports GraphQL query over GET', async () => {
		// 	const expectedResponse = {
		// 		data: {
		// 			firstName: 'Alan',
		// 		},
		// 	};
		// 	const server = run({
		// 		scenarios: {
		// 			default: {
		//
		//
		// 				mocks: [
		// 					{
		// 						url: '/api/graphql',
		// 						method: 'GRAPHQL',
		// 						operations: [
		// 							{
		// 								type: 'query',
		// 								name: 'Person',
		// 								response: { data: expectedResponse },
		// 							},
		// 						],
		// 					},
		// 				],
		// 			},
		// 		},
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query Person {
		//         firstName
		//       }
		//     `;
		// 		const response = await fetch(
		// 			`http://localhost:3000/api/graphql?query=${query}`,
		// 		).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('supports GraphQL variables over GET', async () => {
		// 	const getVariables = { a: 1, b: 2 };
		// 	const expectedResponse = {
		// 		data: {
		// 			variables: getVariables,
		// 		},
		// 	};
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'Person',
		// 						response: ({ variables }) => ({
		// 							data: {
		// 								data: {
		// 									variables,
		// 								},
		// 							},
		// 						}),
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query Person {
		//         firstName
		//       }
		//     `;
		// 		const response = await fetch(
		// 			`http://localhost:3000/api/graphql?query=${query}&variables=${JSON.stringify(
		// 				getVariables,
		// 			)}`,
		// 		).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('supports GraphQL over GET when operationName is provided', async () => {
		// 	const operationName = 'Person';
		// 	const expectedResponse = {
		// 		data: {
		// 			firstName: 'Alan',
		// 		},
		// 	};
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: operationName,
		// 						response: { data: expectedResponse },
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query ${operationName} {
		//         firstName
		//       }
		//     `;
		// 		const response = await fetch(
		// 			`http://localhost:3000/api/graphql?query=${query}&operationName=${operationName}`,
		// 		).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('supports GraphQL query over POST', async () => {
		// 	const expectedResponse = {
		// 		data: {
		// 			firstName: 'Alan',
		// 		},
		// 	};
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'Person',
		// 						response: { data: expectedResponse },
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query Person {
		//         firstName
		//       }
		//     `;
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: {
		// 				'Content-Type': 'application/json',
		// 			},
		// 			body: JSON.stringify({
		// 				query,
		// 			}),
		// 		}).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('supports GraphQL variables over POST', async () => {
		// 	const postVariables = { a: 1, b: 2 };
		// 	const expectedResponse = {
		// 		data: {
		// 			variables: postVariables,
		// 		},
		// 	};
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'Person',
		// 						response: ({ variables }) => ({
		// 							data: {
		// 								data: {
		// 									variables,
		// 								},
		// 							},
		// 						}),
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query Person {
		//         firstName
		//       }
		//     `;
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: {
		// 				'Content-Type': 'application/json',
		// 			},
		// 			body: JSON.stringify({
		// 				query,
		// 				variables: postVariables,
		// 			}),
		// 		}).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('supports GraphQL query over POST when operationName is provided', async () => {
		// 	const operationName = 'Person';
		// 	const expectedResponse = {
		// 		data: {
		// 			firstName: 'Alan',
		// 		},
		// 	};
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: operationName,
		// 						response: { data: expectedResponse },
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query ${operationName} {
		//         firstName
		//       }
		//     `;
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query,
		// 				operationName,
		// 			}),
		// 		}).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('nothing is matched when GraphQL mutation is named like a query', async () => {
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'Query',
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query: 'mutation Query { a }',
		// 			}),
		// 		});

		// 		expect(response.status).toEqual(404);
		// 	});
		// });

		// it('GraphQL operations with the same name and different types allowed', async () => {
		// 	const expectedResponse1 = {
		// 		data: {
		// 			user: {
		// 				name: 'Felicity',
		// 			},
		// 		},
		// 	};
		// 	const expectedResponse2 = {
		// 		data: {
		// 			updateUser: {
		// 				name: 'Felicity Green',
		// 			},
		// 		},
		// 	};

		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'User',
		// 						response: { data: expectedResponse1 },
		// 					},
		// 					{
		// 						type: 'mutation',
		// 						name: 'User',
		// 						response: { data: expectedResponse2 },
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const [response1, response2] = await Promise.all([
		// 			fetch('http://localhost:3000/api/graphql', {
		// 				method: 'POST',
		// 				headers: { 'Content-Type': 'application/json' },
		// 				body: JSON.stringify({
		// 					query: 'query User { user { name } }',
		// 				}),
		// 			}).then((res) => res.json()),
		// 			fetch('http://localhost:3000/api/graphql', {
		// 				method: 'POST',
		// 				headers: { 'Content-Type': 'application/json' },
		// 				body: JSON.stringify({
		// 					query: 'mutation User { updateUser { name } }',
		// 				}),
		// 			}).then((res) => res.json()),
		// 		]);

		// 		expect(response1).toEqual(expectedResponse1);
		// 		expect(response2).toEqual(expectedResponse2);
		// 	});
		// });

		// it('GraphQL operations work when multiple queries and fragments are defined', async () => {
		// 	const expectedResponse = {
		// 		data: {
		// 			user: {
		// 				name: 'Gary',
		// 			},
		// 		},
		// 	};

		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'GetUser',
		// 						response: { data: expectedResponse },
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query: `
		//           fragment userDetails on User {
		//             name
		//           }

		//           query GetAccount {
		//             account {
		//               id
		//             }
		//           }

		//           query GetUser {
		//             user {
		//               ...userDetails
		//             }
		//           }
		//         `,
		// 				operationName: 'GetUser',
		// 			}),
		// 		}).then((res) => res.json());

		// 		expect(response).toEqual(expectedResponse);
		// 	});
		// });

		// it('GraphQL errors when multiple queries exist and no operationName is sent', async () => {
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/api/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'GetAccount',
		// 						response: {
		// 							data: {
		// 								data: {
		// 									account: {
		// 										id: '111222',
		// 									},
		// 								},
		// 							},
		// 						},
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query: `
		//             query GetAccount {
		//               account {
		//                 id
		//               }
		//             }

		//             query GetUser {
		//               user {
		//                 name
		//               }
		//             }
		//           `,
		// 			}),
		// 		});

		// 		expect(response.status).toEqual(400);
		// 	});
		// });

		// it('GraphQL errors when query has no operationName', async () => {
		// 	const server = run({
		// 		default: [],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query: `
		//             {
		//               user {
		//                 name
		//               }
		//             }
		//           `,
		// 			}),
		// 		});

		// 		expect(response.status).toEqual(404);
		// 	});
		// });

		// it('GraphQL errors when supplied operationName does not exist in query', async () => {
		// 	const server = run({
		// 		default: [
		// 			{
		// 				method: 'GRAPHQL',
		// 				url: '/api/graphql',
		// 				operations: [
		// 					{
		// 						type: 'query',
		// 						name: 'GetAccount',
		// 						response: { data: { data: { account: { id: '333444' } } } },
		// 					},
		// 					{
		// 						type: 'query',
		// 						name: 'GetUser',
		// 						response: { data: { data: { user: { name: 'Holly' } } } },
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});

		// 	await serverTest(server, async () => {
		// 		const response = await fetch('http://localhost:3000/api/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query: `
		//             query GetUser {
		//               user {
		//                 name
		//               }
		//             }
		//           `,
		// 				operationName: 'GetAccount',
		// 			}),
		// 		});

		// 		expect(response.status).toEqual(400);
		// 	});
		// });

		it('allows empty responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/api/test',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);
				const body = await response.text();

				expect(response.headers.get('content-type')).toBeNull();
				expect(body).toEqual('');
			});
		});

		it('allows null responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/api/test',
							method: 'GET',
							response: { data: null },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`).then(
					(res) => res.json(),
				);

				expect(response).toBeNull();
			});
		});

		it('adds application/json content-type when response is not undefined', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/api/test',
							method: 'GET',
							response: { data: {} },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);

				expect(response.headers.get('content-type')).toContain(
					'application/json',
				);
			});
		});

		it('adds application/json content-type when response is not undefined and response headers does not contain content-type', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/api/test',
							method: 'GET',
							response: {
								data: {},
								headers: {
									'Made-Up': 'Header',
								},
							},
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);

				expect(response.headers.get('made-up')).toEqual('Header');
				expect(response.headers.get('content-type')).toContain(
					'application/json',
				);
			});
		});

		it('does not add application/json content-type when content-type is already defined', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							url: '/api/test',
							method: 'GET',
							response: {
								headers: {
									'Content-Type': 'text/*',
								},
							},
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);

				expect(response.headers.get('content-type')).toContain('text/*');
			});
		});

		it('context works for non GraphQL requests', async () => {
			const initialName = 'Alice';
			const updatedName = 'Bob';

			const server = run({
				scenarios: {
					test: {
						context: { name: initialName },
						mocks: [
							{
								url: '/user',
								method: 'GET',
								response: ({ context }) => ({ data: context.name as string }),
							},
							{
								url: '/user',
								method: 'POST',
								response: ({ body: { name }, updateContext }) => {
									updateContext({ name });

									return { data: name as string };
								},
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const name1 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(name1).toEqual(initialName);

				const name2 = await fetch('http://localhost:3000/user', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: updatedName }),
				}).then((res) => res.json());
				expect(name2).toEqual(updatedName);

				const name3 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(name3).toEqual(updatedName);
			});
		});

		it('partial context can be set', async () => {
			const initialName = 'Dean';
			const updatedName = 'Elle';
			const age = 40;

			const server = run({
				scenarios: {
					test: {
						context: { name: initialName, age },
						mocks: [
							{
								url: '/info',
								method: 'GET',
								response: ({ context }) => ({ data: context }),
							},
							{
								url: '/user',
								method: 'POST',
								response: ({ body: { name }, updateContext }) => {
									updateContext({ name });

									return { data: name as string };
								},
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const info1 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info1).toEqual({ name: initialName, age });

				const name = await fetch('http://localhost:3000/user', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: updatedName }),
				}).then((res) => res.json());
				expect(name).toEqual(updatedName);

				const info2 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info2).toEqual({ name: updatedName, age });
			});
		});

		it('partial context can be set using a function', async () => {
			const name = 'Betty';
			const initialAge = 40;
			const intervalDelayMs = 200;
			const intervalTickCount = 5;
			const timeoutDelayMs = intervalDelayMs * intervalTickCount + 100;

			const server = run({
				scenarios: {
					test: {
						context: { age: initialAge, name },
						mocks: [
							{
								url: '/info',
								method: 'GET',
								response: ({ context }) => ({ data: context }),
							},
							{
								url: '/user',
								method: 'POST',
								response: ({ updateContext }) => {
									const interval = setInterval(() => {
										updateContext(({ age }) => ({ age: (age as number) + 1 }));
									}, intervalDelayMs);
									setTimeout(() => {
										clearInterval(interval);
									}, timeoutDelayMs);

									return { data: null };
								},
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const info1 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info1).toEqual({ name, age: initialAge });

				await fetch('http://localhost:3000/user', {
					method: 'POST',
				});

				await new Promise((resolve) => {
					setTimeout(() => {
						resolve(null);
					}, timeoutDelayMs + 100);
				});

				const info2 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info2).toEqual({ name, age: initialAge + intervalTickCount });
			});
		});

		// TODO: GraphQL
		// it('context works for GraphQL requests', async () => {
		// 	const initialName = 'Alice';
		// 	const updatedName = 'Bob';

		// 	const server = run({
		// 		default: {
		// 			context: { name: initialName },
		// 			mocks: [
		// 				{
		// 					url: '/graphql',
		// 					method: 'GRAPHQL',
		// 					operations: [
		// 						{
		// 							type: 'query',
		// 							name: 'GetUser',
		// 							response: ({ context }) => ({
		// 								data: { data: { user: { name: context.name } } },
		// 							}),
		// 						},
		// 						{
		// 							type: 'mutation',
		// 							name: 'UpdateUser',
		// 							response: ({ updateContext, variables: { name } }) => {
		// 								updateContext({ name });

		// 								return {
		// 									data: { data: { updateUser: { name } } },
		// 								};
		// 							},
		// 						},
		// 					],
		// 				},
		// 			],
		// 		},
		// 	});

		// 	await serverTest(server, async () => {
		// 		const query = `
		//       query GetUser {
		//         user {
		//           name
		//         }
		//       }
		//     `;
		// 		const mutation = `
		//       mutation UpdateUser($name: String!) {
		//         updateUser(name: $name) {
		//           name
		//         }
		//       }
		//     `;

		// 		const result1 = await fetch('http://localhost:3000/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query,
		// 			}),
		// 		}).then((res) => res.json());
		// 		expect((result1 as any).data.user.name).toEqual(initialName);

		// 		const result2 = await fetch('http://localhost:3000/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query: mutation,
		// 				variables: { name: updatedName },
		// 			}),
		// 		}).then((res) => res.json());
		// 		expect((result2 as any).data.updateUser.name).toEqual(updatedName);

		// 		const result3 = await fetch('http://localhost:3000/graphql', {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({
		// 				query,
		// 			}),
		// 		}).then((res) => res.json());
		// 		expect((result3 as any).data.user.name).toEqual(updatedName);
		// 	});
		// });
	});

	describe('scenarios', () => {
		it('override extended urls', async () => {
			const expectedInitialResponse = {};
			const expectedResponse = { something: 'new' };
			const server = run({
				scenarios: {
					default: [
						{
							url: '/test-me',
							method: 'GET',
							response: { data: expectedInitialResponse },
						},
					],
					test: {
						extend: 'default',
						mocks: [
							{
								url: '/test-me',
								method: 'GET',
								response: { data: expectedResponse },
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const initialResponse = await fetch(
					'http://localhost:3000/test-me',
				).then((res) => res.json());
				expect(initialResponse).toEqual(expectedInitialResponse);

				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const response = await fetch('http://localhost:3000/test-me').then(
					(res) => res.json(),
				);
				expect(response).toEqual(expectedResponse);
			});
		});

		// TODO: GraphQL
		// it('GraphQL operations on the same URL are merged', async () => {
		// 	const expectedResponse1 = { data: { a: 1 } };
		// 	const expectedResponse2 = { data: { b: 2 } };
		// 	const expectedResponse3 = { data: { c: 3 } };
		// 	const server = run({
		// 		default: [
		// 			{
		// 				url: '/graphql',
		// 				method: 'GRAPHQL',
		// 				operations: [
		// 					{
		// 						name: 'Query1',
		// 						type: 'query',
		// 						response: { data: expectedResponse1 },
		// 					},
		// 					{
		// 						name: 'Query2',
		// 						type: 'query',
		// 					},
		// 				],
		// 			},
		// 		],
		// 		scenarios: {
		// 			query2: [
		// 				{
		// 					url: '/graphql',
		// 					method: 'GRAPHQL',
		// 					operations: [
		// 						{
		// 							name: 'Query2',
		// 							type: 'query',
		// 							response: { data: expectedResponse2 },
		// 						},
		// 					],
		// 				},
		// 			],
		// 			query3: [
		// 				{
		// 					url: '/graphql',
		// 					method: 'GRAPHQL',
		// 					operations: [
		// 						{
		// 							name: 'Query3',
		// 							type: 'query',
		// 							response: { data: expectedResponse3 },
		// 						},
		// 					],
		// 				},
		// 			],
		// 		},
		// 	});

		// 	await serverTest(server, async () => {
		// 		await fetch('http://localhost:3000/select-scenarios', {
		// 			method: 'PUT',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify({ scenarios: ['query2', 'query3'] }),
		// 		});

		// 		const [response1, response2, response3] = await Promise.all([
		// 			fetch('http://localhost:3000/graphql', {
		// 				method: 'POST',
		// 				headers: { 'Content-Type': 'application/json' },
		// 				body: JSON.stringify({
		// 					query: 'query Query1 { a }',
		// 				}),
		// 			}).then((res) => res.json()),
		// 			fetch('http://localhost:3000/graphql', {
		// 				method: 'POST',
		// 				headers: { 'Content-Type': 'application/json' },
		// 				body: JSON.stringify({
		// 					query: 'query Query2 { b }',
		// 				}),
		// 			}).then((res) => res.json()),
		// 			fetch('http://localhost:3000/graphql', {
		// 				method: 'POST',
		// 				headers: { 'Content-Type': 'application/json' },
		// 				body: JSON.stringify({
		// 					query: 'query Query3 { c }',
		// 				}),
		// 			}).then((res) => res.json()),
		// 		]);

		// 		expect(response1).toEqual(expectedResponse1);
		// 		expect(response2).toEqual(expectedResponse2);
		// 		expect(response3).toEqual(expectedResponse3);
		// 	});
		// });

		it('select-scenario and scenarios paths can be changed', async () => {
			const initialResponse = { something: 'old' };
			const scenarioResponse = { something: 'new' };
			const server = run({
				scenarios: {
					default: [
						{
							url: '/test-me',
							method: 'GET',
							response: { data: initialResponse },
						},
					],
					test: [
						{
							url: '/test-me',
							method: 'GET',
							response: { data: scenarioResponse },
						},
					],
				},
				options: {
					selectScenarioPath: '/select',
					scenariosPath: '/get-scenarios',
				},
			});

			await serverTest(server, async () => {
				const scenariosResponse = await fetch(
					'http://localhost:3000/get-scenarios',
				).then((res) => res.json());
				expect(Array.isArray(scenariosResponse)).toEqual(true);

				const firstResponse = await fetch('http://localhost:3000/test-me').then(
					(res) => res.json(),
				);
				expect(firstResponse).toEqual(initialResponse);

				await fetch('http://localhost:3000/select', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const secondResponse = await fetch(
					'http://localhost:3000/test-me',
				).then((res) => res.json());
				expect(secondResponse).toEqual(scenarioResponse);
			});
		});

		it('scenario context overrides extended context', async () => {
			const defaultName = 'Alice';
			const scenarioName = 'Bob';

			const server = run({
				scenarios: {
					default: {
						context: { name: defaultName },
						mocks: [
							{
								url: '/user',
								method: 'GET',
								response: ({ context }) => ({
									data: context.name as string,
								}),
							},
						],
					},
					test: {
						extend: 'default',
						context: { name: scenarioName },
						mocks: [],
					},
				},
			});

			await serverTest(server, async () => {
				const name1 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(name1).toEqual(defaultName);

				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const name2 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(name2).toEqual(scenarioName);
			});
		});

		it('scenario context adds to extended context', async () => {
			const name = 'Alice';
			const age = 30;

			const server = run({
				scenarios: {
					default: {
						context: { name },
						mocks: [
							{
								url: '/info',
								method: 'GET',
								response: ({ context }) => ({ data: context }),
							},
						],
					},
					test: {
						extend: 'default',
						context: { age },
						mocks: [],
					},
				},
			});

			await serverTest(server, async () => {
				const info1 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info1).toEqual({ name });

				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const info2 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info2).toEqual({ name, age });
			});
		});
	});

	describe('GET scenarios', () => {
		it('returns the correct value for "selected"', async () => {
			const server = run({
				scenarios: {
					default: [],
					test1: [
						{
							url: '/test-me-1',
							method: 'GET',
						},
					],
					test2: [
						{
							url: '/test-me-2',
							method: 'GET',
						},
					],
					test3: [
						{
							url: '/test-me-3',
							method: 'GET',
						},
					],
					test4: [
						{
							url: '/test-me-4',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test2' }),
				});

				const scenariosResponse = await fetch(
					'http://localhost:3000/scenarios',
				).then((res) => res.json());

				expect(scenariosResponse).toEqual([
					{
						id: 'default',
						name: 'default',
						description: null,
						selected: false,
					},
					{
						id: 'test1',
						name: 'test1',
						description: null,
						selected: false,
					},
					{
						id: 'test2',
						name: 'test2',
						description: null,
						selected: true,
					},
					{
						id: 'test3',
						name: 'test3',
						description: null,
						selected: false,
					},
					{
						id: 'test4',
						name: 'test4',
						description: null,
						selected: false,
					},
				]);
			});
		});
	});
});

function getStartTime() {
	return process.hrtime();
}

function getDuration(startTime: [number, number]) {
	const hrend = process.hrtime(startTime);
	return hrend[0] * 1000 + hrend[1] / 1000000;
}

function serverTest(server: ServerWithKill, fn: () => void) {
	return new Promise((resolve, reject) => {
		server.on('listening', async () => {
			try {
				await fn();
				server.kill(() => {
					resolve(null);
				});
			} catch (error) {
				server.kill(() => {
					reject(error);
				});
			}
		});
	});
}
