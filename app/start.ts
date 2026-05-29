import { createStart } from "@tanstack/react-start";

import { csrfMiddleware } from "#/lib/middleware/csrf";

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware],
}));
