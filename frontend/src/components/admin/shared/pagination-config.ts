// Pagination presets shared between the admin list screens and the shared
// AdminPagination component. Kept in its own module so the component file
// only exports React components — required by the `react-refresh/only-export-
// components` rule that otherwise trips on mixed module exports.

export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];
