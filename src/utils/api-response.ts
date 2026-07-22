import { NextResponse } from "next/server";
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
 * Parse search/pagination params from a URL.
 */
export function parseListParams(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10))
  );
  const search = url.searchParams.get("search")?.trim() || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder =
    url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  return { page, pageSize, search, sortBy, sortOrder, skip: (page - 1) * pageSize };
}
