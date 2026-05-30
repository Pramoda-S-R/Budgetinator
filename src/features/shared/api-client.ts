import type { ZodType } from "zod";
import type { User } from "#/hooks/use-current-user";

export type ApiErrorKind = "network" | "http" | "decode";

export type ApiError = {
	kind: ApiErrorKind;
	endpoint: string;
	message: string;
	status?: number;
	issues?: unknown;
	cause?: unknown;
};

export type ApiResult<T> =
	| {
			ok: true;
			endpoint: string;
			status: number;
			data: T;
	  }
	| {
			ok: false;
			error: ApiError;
	  };

export class ApiRequestError extends Error {
	readonly kind: ApiErrorKind;
	readonly endpoint: string;
	readonly status?: number;
	readonly issues?: unknown;
	readonly cause?: unknown;

	constructor(error: ApiError) {
		super(error.message);
		this.name = "ApiRequestError";
		this.kind = error.kind;
		this.endpoint = error.endpoint;
		this.status = error.status;
		this.issues = error.issues;
		this.cause = error.cause;
	}
}

const CSRF_TOKEN_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";

function readCookie(name: string): string | undefined {
	if (typeof document === "undefined") {
		return undefined;
	}

	return document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function mergeHeaders(headersInit?: HeadersInit): Record<string, string> {
	const headers = new Headers();

	if (headersInit) {
		for (const [key, value] of new Headers(headersInit).entries()) {
			headers.set(key, value);
		}
	}

	return Object.fromEntries(headers.entries());
}

function isBodyInitLike(value: unknown): value is BodyInit {
	return (
		typeof value === "string" ||
		value instanceof FormData ||
		value instanceof URLSearchParams ||
		value instanceof Blob ||
		value instanceof ArrayBuffer ||
		ArrayBuffer.isView(value)
	);
}

async function readPayload(response: Response): Promise<unknown> {
	const text = await response.text();

	if (!text) {
		return undefined;
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function messageFromPayload(payload: unknown, fallback: string): string {
	if (typeof payload !== "object" || payload === null) {
		return fallback;
	}

	const payloadRecord = payload as Record<string, unknown>;
	const errorValue = payloadRecord.error;
	const messageValue = payloadRecord.message;

	const candidate =
		(typeof errorValue === "string" && errorValue) ||
		(typeof messageValue === "string" && messageValue) ||
		fallback;

	return candidate;
}

function issuesFromPayload(payload: unknown): unknown {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}

	return (payload as Record<string, unknown>).issues;
}

type RequestOptions<TResponse> = {
	endpoint: string;
	method: string;
	schema: ZodType<TResponse>;
	body?: unknown;
	headers?: HeadersInit;
};

async function requestJson<TResponse>(
	_user: User | undefined,
	options: RequestOptions<TResponse>,
): Promise<ApiResult<TResponse>> {
	const headers = mergeHeaders(options.headers);

	let body: BodyInit | undefined;
	const requiresCsrfHeader = !["GET", "HEAD"].includes(options.method);
	if (requiresCsrfHeader && !headers[CSRF_HEADER_NAME]) {
		const csrfToken = readCookie(CSRF_TOKEN_NAME);
		if (csrfToken) {
			headers[CSRF_HEADER_NAME] = csrfToken;
		}
	}

	if (options.body !== undefined) {
		if (isBodyInitLike(options.body)) {
			body = options.body;
		} else {
			body = JSON.stringify(options.body);
			if (!headers["content-type"]) {
				headers["content-type"] = "application/json";
			}
		}
	}

	let response: Response;
	try {
		response = await fetch(options.endpoint, {
			method: options.method,
			credentials: "same-origin",
			headers,
			body,
		});
	} catch (error) {
		return {
			ok: false,
			error: {
				kind: "network",
				endpoint: options.endpoint,
				message: "Network request failed",
				cause: error,
			},
		};
	}

	const payload = await readPayload(response);

	if (!response.ok) {
		return {
			ok: false,
			error: {
				kind: "http",
				endpoint: options.endpoint,
				status: response.status,
				message: messageFromPayload(
					payload,
					`Request failed: ${response.status}`,
				),
				issues: issuesFromPayload(payload),
			},
		};
	}

	const parsed = options.schema.safeParse(payload);
	if (!parsed.success) {
		return {
			ok: false,
			error: {
				kind: "decode",
				endpoint: options.endpoint,
				status: response.status,
				message: "Response decode failed",
				issues: parsed.error.issues,
			},
		};
	}

	return {
		ok: true,
		endpoint: options.endpoint,
		status: response.status,
		data: parsed.data,
	};
}

export function createApiClient(user?: User) {
	return {
		get<TResponse>(endpoint: string, schema: ZodType<TResponse>) {
			return requestJson(user, { endpoint, method: "GET", schema });
		},
		delete<TResponse>(endpoint: string, schema: ZodType<TResponse>) {
			return requestJson(user, { endpoint, method: "DELETE", schema });
		},
		post<TResponse>(
			endpoint: string,
			body: unknown,
			schema: ZodType<TResponse>,
		) {
			return requestJson(user, { endpoint, method: "POST", body, schema });
		},
		patch<TResponse>(
			endpoint: string,
			body: unknown,
			schema: ZodType<TResponse>,
		) {
			return requestJson(user, { endpoint, method: "PATCH", body, schema });
		},
	};
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
	if (result.ok) {
		return result.data;
	}

	throw new ApiRequestError(result.error);
}
