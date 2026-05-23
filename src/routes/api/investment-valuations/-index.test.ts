import { describe, test } from 'vitest';

describe('GET /api/investment-valuations/', () => {
  test.todo('returns empty array when no valuations');
  test.todo('lists valuations sorted by valuationDate for the user');
});

describe('POST /api/investment-valuations/', () => {
  test.todo('creates valuation with valid data');
  test.todo('returns 400 for invalid request body');
  test.todo('returns 404 if investment not found');
});
