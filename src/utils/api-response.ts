import { NextResponse } from "next/server";
import type { ZodError } from "zod/v4";
import type { ApiResponse } from "@/src/types";

/**
 * Return a success JSON response.
 */
export function successResponse<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

/**
 * Return an error JSON response.
 */
export function errorResponse(message: string, status = 500) {
  const body: ApiResponse = { success: false, message };
  return NextResponse.json(body, { status });
}

/**
 * Return a validation error JSON response (422).
 */
export function validationErrorResponse(
  errors: Record<string, string[]>,
  message = "Data tidak valid"
) {
  const body: ApiResponse = { success: false, message, errors };
  return NextResponse.json(body, { status: 422 });
}

/**
 * Convert a ZodError into the { field: [messages] } shape used by
 * validationErrorResponse and the react-hook-form clients.
 */
export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_root";
    if (!fieldErrors[field]) fieldErrors[field] = [];
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}

function toFiniteInt(raw: string | null, fallback: number): number {
  const parsed = parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parse search/pagination params from a URL. NaN-safe; pageSize clamped to
 * 1..100. Pass allowedSortFields to whitelist sortBy (falls back to createdAt).
 */
export function parseListParams(url: URL, allowedSortFields?: string[]) {
  const page = Math.max(1, toFiniteInt(url.searchParams.get("page"), 1));
  const pageSize = Math.min(
    100,
    Math.max(1, toFiniteInt(url.searchParams.get("pageSize"), 10))
  );
  const search = url.searchParams.get("search")?.trim() || "";
  let sortBy = url.searchParams.get("sortBy") || "createdAt";
  if (allowedSortFields && !allowedSortFields.includes(sortBy)) {
    sortBy = "createdAt";
  }
  const sortOrder =
    url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  return { page, pageSize, search, sortBy, sortOrder, skip: (page - 1) * pageSize };
}
