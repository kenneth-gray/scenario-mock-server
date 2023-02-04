import { run } from '../src';

run({
	scenarios: {
		default: {
			context: {
				a: 1,
				b: 2,
				c: 3,
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
					operations: [
						{
							type: 'query',
							name: 'Cheese',
							response: {
								data: {
									data: {
										name: 'Cheddar',
									},
								},
							},
						},
						{
							type: 'query',
							name: 'Bread',
							response: {
								data: {
									data: {
										name: 'Bread Roll',
									},
								},
							},
						},
					],
				},
				{
					url: '/api/graphql-function',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Function',
							response: async ({ variables }) => {
								return {
									data: {
										data: {
											variables,
										},
									},
								};
							},
						},
					],
				},
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
				{
					url: '/api/graphql',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Cheese',
							response: {
								data: {
									data: {
										name: 'Blue Cheese',
									},
								},
							},
						},
					],
				},
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
				{
					url: '/api/graphql',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Cheese',
							response: {
								data: {
									data: {
										name: 'Red Leicester',
									},
								},
							},
						},
					],
				},
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
		cookieMode: true,
	},
});
