import { describe, test } from "vitest";

describe("GET /api/investments/", () => {
	test.todo("returns empty array when no investments");
	test.todo("returns list of investments belonging to the user");
});

describe("POST /api/investments/", () => {
	test.todo("creates investment with valid data");
	test.todo("returns 400 for invalid request body");
});
