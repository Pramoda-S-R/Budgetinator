export function resolveSortOrder(lastSortOrder: number | null | undefined, requestedSortOrder?: number) {
  if (typeof requestedSortOrder === "number" && Number.isFinite(requestedSortOrder)) {
    return Math.max(0, Math.floor(requestedSortOrder));
  }

  if (typeof lastSortOrder === "number" && Number.isFinite(lastSortOrder)) {
    return Math.max(0, Math.floor(lastSortOrder)) + 1;
  }

  return 0;
}
