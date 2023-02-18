import { pathToRegexp, Key } from 'path-to-regexp';

import { createHandler } from './create-handler';
import {
	Mock,
	HttpMock,
	UpdateContext,
	GetContext,
	InternalRequest,
} from './types';

export { getHttpMocks, getHttpMockAndParams, httpRequestHandler };

function isHttpMock(mock: Mock): mock is HttpMock {
	return mock.method !== 'GRAPHQL';
}

// TODO: Extend context as well?
function getHttpMocks(mocks: Mock[]) {
	const initialHttpMocks = mocks.filter(isHttpMock);

	const httpMocksByUrlAndMethod = initialHttpMocks.reduce<
		Record<string, HttpMock>
	>((result, mock) => {
		const { url, method } = mock;
		// Always take the latest mock
		result[`${String(url)}${method}`] = mock;

		return result;
	}, {});

	return Object.values(httpMocksByUrlAndMethod);
}

function httpRequestHandler({
	req,
	httpMock,
	params,
	updateContext,
	getContext,
}: {
	req: InternalRequest;
	httpMock: HttpMock;
	params: Record<string, string>;
	updateContext: UpdateContext;
	getContext: GetContext;
}) {
	const { body, ...restOfReq } = req;
	const handler = createHandler({
		...httpMock,
		getContext,
		updateContext,
	});

	return handler({
		...restOfReq,
		params,
		body: typeof body === 'string' ? {} : body,
	});
}

function getHttpMockAndParams(req: InternalRequest, httpMocks: HttpMock[]) {
	for (const httpMock of httpMocks) {
		if (httpMock.method !== req.method) {
			continue;
		}

		const { match, params } = getMatchAndParams(req.path, httpMock.url);

		if (match) {
			return {
				httpMock,
				params,
			};
		}
	}

	return {
		httpMock: null,
		params: {},
	};
}

function getMatchAndParams(reqPath: string, mockUrl: string | RegExp) {
	const params: Record<string, string> = {};
	const keys: Key[] = [];
	const regex = pathToRegexp(mockUrl, keys);
	const match = regex.exec(reqPath);

	if (!match) {
		return {
			match: false,
			params,
		};
	}

	for (let i = 1; i < match.length; i++) {
		const key = keys[i - 1];
		const prop = key.name;

		params[prop] = decodeURIComponent(match[i]);
	}

	return {
		match: true,
		params,
	};
}
