export type Result = {
	status: number;
	headers?: Record<string, string>;
	response?: unknown;
};

export type Scenario =
	| {
			// TODO: Test name defaulting to id
			name?: string;
			description?: string;
			context?: Context;
			mocks: Mock[];
			extend?: string;
	  }
	| Mock[];

export type InternalScenario = {
	id: string;
	name: string;
	description?: string;
	context?: Context;
	mocks: Mock[];
	extend?: string;
};

export type SetScenarioId = (scenarioId: string) => void;
export type SetContext = (context: Context) => void;

export type ScenarioMap = Record<string, Scenario>;

export type InternalScenarioMap = Record<string, InternalScenario>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ResponseFunction<TInput, TResponse> = (
	input: TInput & {
		updateContext: UpdateContext;
		context: Context;
	},
) => TResponse | Promise<TResponse>;

export type MockResponse<TInput, TResponse> =
	| TResponse
	| ResponseFunction<TInput, TResponse>;

type HttpResponse =
	| Record<string, unknown>
	| string
	| number
	| unknown[]
	| null;

export type ResponseProps<TInput, TResponse> = {
	response?: MockResponse<
		TInput,
		{
			data?: TResponse;
			status?: number;
			headers?: Record<string, string>;
			delay?: number;
		}
	>;
};

export type HttpMock = {
	url: string | RegExp;
	method: HttpMethod;
} & ResponseProps<
	{
		query: Record<string, string | Array<string>>;
		body: Record<string, unknown>;
		params: Record<string, string>;
	},
	HttpResponse
>;

type GraphQlOptions = {
	variables: Record<string, unknown>;
	operationName: string;
};

type GraphQlResolverValue = MockResponse<
	GraphQlOptions,
	| string
	| number
	| null
	| boolean
	| undefined
	| Array<GraphQlResolverValue>
	| GraphQlResolverValueRecord
>;

type GraphQlResolverValueRecord = {
	[key: string]: GraphQlResolverValue;
};

type GraphQlResponse = {
	delay?: number;
	data: GraphQlResolverValue;
	errors?: Array<{
		message: string;
		locations?: Array<{ line: number; column: number }>;
		path?: Array<string | number>;
		extensions?: Record<string, unknown>;
	}>;
};

type QueryOrMutation = MockResponse<GraphQlOptions, GraphQlResponse>;

export type GraphQlMock = {
	url: string;
	method: 'GRAPHQL';
	schema: string;
	context?: Context;
	types?: Record<string, GraphQlResolverValue>;
	queries?: Record<string, QueryOrMutation>;
	mutations?: Record<string, QueryOrMutation>;
};

export type Mock = HttpMock | GraphQlMock;

export type Options = {
	port?: number;
	uiPath?: string;
	selectScenarioPath?: string;
	scenariosPath?: string;
	cookieMode?: boolean;
};

export type Context = Record<string, unknown>;
export type PartialContext = Context | ((context: Context) => Context);

export type UpdateContext = (partialContext: PartialContext) => Context;

export type GetContext = () => Context;

export type CookieValue = {
	scenarioId: string;
	context: Context;
};

export type InternalRequest = {
	method: string;
	headers: Record<string, string>;
	query: Record<string, string>;
	path: string;
	body: string | Record<string, unknown>;
};

export type GetCookie = (cookieName: string) => string | undefined;
export type SetCookie = (cookieName: string, cookieValue: string) => void;
