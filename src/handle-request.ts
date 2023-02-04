import {
	getGraphQlMocks,
	getGraphQlMock,
	graphQlRequestHandler,
} from './graph-ql';
import { getHttpMocks, getHttpMockAndParams, httpRequestHandler } from './http';
import {
	Context,
	PartialContext,
	InternalRequest,
	Result,
	GetCookie,
	SetCookie,
	InternalScenario,
	InternalScenarioMap,
} from './types';
import {
	getScenarioMockServerCookie,
	setScenarioMockServerCookie,
} from './cookies';
import { getScenarioIds } from './utils/get-scenario-ids';

function updateContext(context: Context, partialContext: PartialContext) {
	const newContext: Context = {
		...context,
		...(typeof partialContext === 'function'
			? partialContext(context)
			: partialContext),
	};

	return newContext;
}

function getMocksFromScenario(
	scenario: InternalScenario,
	scenarioMap: InternalScenarioMap,
) {
	const scenarioIds = getScenarioIds([], scenario, scenarioMap);
	const mocks = scenarioIds
		.map((scenarioId) => scenarioMap[scenarioId].mocks)
		.reduce((result, mocks) => result.concat(mocks), []);

	const httpMocks = getHttpMocks(mocks);
	const graphQlMocks = getGraphQlMocks(mocks);

	return { httpMocks, graphQlMocks };
}

async function handleRequest({
	req,
	getServerSelectedScenarioId,
	initialScenarioId,
	initialContext,
	scenarioMap,
	getServerContext,
	setServerContext,
	getCookie,
	cookieMode,
	setCookie,
}: {
	req: InternalRequest;
	getServerSelectedScenarioId: () => string;
	initialScenarioId: string;
	initialContext: Context;
	scenarioMap: InternalScenarioMap;
	getServerContext: () => Context;
	setServerContext: (context: Context) => void;
	getCookie: GetCookie;
	setCookie: SetCookie;
	cookieMode: boolean;
}) {
	const scenarioMockServerCookie = getScenarioMockServerCookie({
		initialContext,
		initialScenarioId,
		getCookie,
	});

	const getSelectedScenarioId = cookieMode
		? () => scenarioMockServerCookie.scenarioId
		: getServerSelectedScenarioId;

	const getContext = cookieMode
		? () => scenarioMockServerCookie.context
		: getServerContext;

	const setContext = cookieMode
		? (context: Context) => {
				scenarioMockServerCookie.context = context;
		  }
		: setServerContext;

	const selectedScenarioId = getSelectedScenarioId();
	const selectedScenario = scenarioMap[selectedScenarioId];

	const { httpMocks, graphQlMocks } = getMocksFromScenario(
		selectedScenario,
		scenarioMap,
	);

	const graphQlMock = getGraphQlMock(req.path, graphQlMocks);

	// Default when nothing matches
	let result: Result = { status: 404 };

	if (graphQlMock) {
		result = await graphQlRequestHandler({
			req,
			graphQlMock,
			updateContext: localUpdateContext,
			getContext,
		});
	} else {
		const { httpMock, params } = getHttpMockAndParams(req, httpMocks);
		if (httpMock) {
			result = await httpRequestHandler({
				req,
				httpMock,
				params,
				getContext,
				updateContext: localUpdateContext,
			});
		}
	}

	if (cookieMode) {
		setScenarioMockServerCookie({ setCookie, value: scenarioMockServerCookie });
	}

	return result;

	function localUpdateContext(partialContext: PartialContext) {
		const newContext = updateContext(getContext(), partialContext);

		setContext(newContext);

		return newContext;
	}
}

export { handleRequest };
