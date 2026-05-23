import { describe, test } from 'vitest';

describe('GET /api/investment-entries/', () => {
  test.todo('returns empty array when no entries');
  test.todo('lists entries sorted by investedAt for the user');
});

describe('POST /api/investment-entries/', () => {
  test.todo('creates entry with valid data');
  test.todo('returns 400 for invalid request body');
  test.todo('returns 404 if investment not found');
});
