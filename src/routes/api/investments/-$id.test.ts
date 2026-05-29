import { describe, test } from "vitest";

describe("PATCH /api/investments/$id", () => {
	test.todo("updates name, investmentType, or symbol fields");
	test.todo("returns 404 if investment not found or not owned");
	test.todo("returns 400 for invalid request body");
});

describe("DELETE /api/investments/$id", () => {
	test.todo("deletes investment owned by the user");
	test.todo("returns 404 for invalid id or not owned");
});
