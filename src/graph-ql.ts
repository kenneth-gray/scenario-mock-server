import { DefinitionNode, Kind, OperationDefinitionNode } from 'graphql';
import gql from 'graphql-tag';
import z, { promise } from 'zod';

import { createHandler } from './create-handler';
import {
	GraphQlMock,
	Mock,
	UpdateContext,
	GetContext,
	InternalRequest,
	Result,
} from './types';

export { getGraphQlMocks, getGraphQlMock, graphQlRequestHandler };

type GraphQlHandler = (req: {
	operationType: 'query' | 'mutation';
	operationName: string;
	variables: Record<string, unknown>;
}) => Promise<null | Result>;

function isGraphQlMock(mock: Mock): mock is GraphQlMock {
	return mock.method === 'GRAPHQL';
}

function getGraphQlMocks(mocks: Mock[]) {
	const initialGraphQlMocks = mocks.filter(isGraphQlMock);

	const graphQlMocks: Record<string, GraphQlMock> = {};

	initialGraphQlMocks.forEach((mock) => {
		const { types = {}, queries = {}, mutations = {} } = mock;
		const newMock = graphQlMocks[mock.url]
			? graphQlMocks[mock.url]
			: { ...mock };

		// TODO: Could make this repeatable
		Object.entries(types).forEach(([key, value]) => {
			newMock.types = newMock.types ? { ...newMock.types } : {};
			newMock.types[key] = value;
		});
		Object.entries(queries).forEach(([key, value]) => {
			newMock.queries = newMock.queries ? { ...newMock.queries } : {};
			newMock.queries[key] = value;
		});
		Object.entries(mutations).forEach(([key, value]) => {
			newMock.mutations = newMock.mutations ? { ...newMock.mutations } : {};
			newMock.mutations[key] = value;
		});

		graphQlMocks[mock.url] = newMock;
	});

	return Object.values(graphQlMocks);
}

function createGraphQlHandler({
	name: operationNameToCheck,
	type: operationTypeToCheck,
	...rest
}: Operation & {
	updateContext: UpdateContext;
	getContext: GetContext;
}): GraphQlHandler {
	const handler = createHandler(rest);

	return async ({ operationType, operationName, variables }) => {
		if (
			operationType === operationTypeToCheck &&
			operationName === operationNameToCheck
		) {
			const result = await handler({
				operationName,
				variables,
			});

			return result;
		}

		return null;
	};
}

const bodySchema = z
	.object({
		query: z.string().optional(),
		operationName: z.string().optional(),
		variables: z.object({}).passthrough().optional(),
	})
	.default({})
	.catch({});

function getGraphQlMock(path: string, graphqlMocks: GraphQlMock[]) {
	return graphqlMocks.find((graphQlMock) => graphQlMock.url === path) || null;
}

function getQueries({
	graphQlMock,
	updateContext,
	getContext,
}: {
	graphQlMock: GraphQlMock;
	updateContext: UpdateContext;
	getContext: GetContext;
}) {
	if (!graphQlMock.queries) {
		return [];
	}

	return Object.entries(graphQlMock.queries).map(([queryName, resolver]) =>
		createGraphQlHandler({
			queryName,
			resolver,
			updateContext,
			getContext,
		}),
	);
}

function getMutations({
	graphQlMock,
	updateContext,
	getContext,
}: {
	graphQlMock: GraphQlMock;
	updateContext: UpdateContext;
	getContext: GetContext;
}) {
	return graphQlMock.operations
		.filter(({ type }) => type === 'mutation')
		.map((operation) =>
			createGraphQlHandler({
				...operation,
				updateContext,
				getContext,
			}),
		);
}

function isOperationDefinition(
	definition: DefinitionNode,
): definition is OperationDefinitionNode {
	return definition.kind === Kind.OPERATION_DEFINITION;
}

async function graphQlRequestHandler({
	req,
	graphQlMock,
	updateContext,
	getContext,
}: {
	req: InternalRequest;
	graphQlMock: GraphQlMock;
	updateContext: UpdateContext;
	getContext: GetContext;
}): Promise<Result> {
	let query: string;
	const body = bodySchema.parse(req.body);

	if (req.headers['content-type'] === 'application/graphql') {
		query = typeof req.body === 'string' ? req.body : '';
	} else {
		query = body.query || req.query.query || '';
	}

	let graphqlAst;
	try {
		graphqlAst = gql(query);
	} catch (error) {
		const result = {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			response: { message: `query "${query}" is not a valid GraphQL query` },
		};

		return result;
	}

	const operationDefitions = graphqlAst.definitions.filter(
		isOperationDefinition,
	);

	if (
		operationDefitions.length > 1 &&
		!body.operationName &&
		!req.query.operationName
	) {
		const result = {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			response: {
				message: `operationName required for query "${query}"`,
			},
		};

		return result;
	}

	const operationName =
		body.operationName ||
		req.query.operationName ||
		// Select the first operation
		operationDefitions[0].name;

	const operationDefinition = operationDefitions.find(
		(definition) => definition.name === operationName,
	);

	if (!operationDefinition) {
		const result = {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			response: {
				message: `Operation ${operationName} could not be found`,
			},
		};

		return result;
	}

	const operationType = operationDefinition.operation;

	let variables: Record<string, unknown> | undefined = body.variables;
	if (variables === undefined && req.query.variables) {
		try {
			variables = JSON.parse(req.query.variables);
		} catch (error) {
			// Do nothing
		}
	}
	variables = variables || {};

	console.log({ operationName, operationType, variables, query });

	// TODO: This is where the magic needs to happen
	// TODO: Look for resolver based on gql request
	const promises = operationDefinition.selectionSet.selections.map(
		(selection) => {
			if (selection.kind !== Kind.FIELD) {
				throw new Error('Only Kind.FIELD currently supported');
			}

			if (!graphQlMock.queries) {
				return Promise.resolve(null);
			}

			const resolver = graphQlMock.queries[selection.name.value];

			if (typeof resolver === 'function') {
				return Promise.resolve(
					resolver({
						context: getContext(),
						updateContext,
						operationName: (operationName as string) || '',
						variables: variables as Record<string, unknown>,
					}),
				);
			}

			return Promise.resolve(resolver);
		},
	);

	const results = await Promise.all(promises);
	console.dir(results, { depth: null });

	console.log('graphqlAst');
	console.dir(graphqlAst, { depth: null });

	const schemaAst = gql(graphQlMock.schema);

	// console.log('schemaAst');
	// console.dir(schemaAst, { depth: null });

	// for (const handler of handlers) {
	// 	const result = await handler({
	// 		operationType,
	// 		operationName,
	// 		variables,
	// 	});

	// 	if (result) {
	// 		return result;
	// 	}
	// }

	return { status: 404 };
}
