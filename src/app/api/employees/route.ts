import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { employeeSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseListParams,
} from "@/src/utils/api-response";

/**
 * GET /api/employees — list employees with search/pagination/sort/filter
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, search, sortBy, sortOrder, skip } =
      parseListParams(url);

    // Optional filters
    const status = url.searchParams.get("status") || "";
    const departmentId = url.searchParams.get("departmentId") || "";
    const positionId = url.searchParams.get("positionId") || "";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;

    // Allowed sort fields
    const allowedSortFields = [
      "code",
      "fullName",
      "email",
      "status",
      "baseSalary",
      "hireDate",
      "createdAt",
    ];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: pageSize,
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return successResponse({
      data: data.map((e) => ({
        ...e,
        baseSalary: Number(e.baseSalary),
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return errorResponse("Gagal memuat data karyawan");
  }
}

/**
 * POST /api/employees — create a new employee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = employeeSchema.safeParse(body);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return validationErrorResponse(fieldErrors);
    }

    // Check for duplicate code
    const existingCode = await prisma.employee.findFirst({
      where: { code: { equals: result.data.code, mode: "insensitive" } },
    });
    if (existingCode) {
      return validationErrorResponse(
        { code: ["Kode karyawan sudah digunakan"] },
        "Kode karyawan duplikat"
      );
    }

    // Check for duplicate email
    const existingEmail = await prisma.employee.findFirst({
      where: { email: { equals: result.data.email, mode: "insensitive" } },
    });
    if (existingEmail) {
      return validationErrorResponse(
        { email: ["Email sudah digunakan"] },
        "Email duplikat"
      );
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: result.data.departmentId },
    });
    if (!department) {
      return validationErrorResponse(
        { departmentId: ["Departemen tidak ditemukan"] }
      );
    }

    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: result.data.positionId },
    });
    if (!position) {
      return validationErrorResponse(
        { positionId: ["Jabatan tidak ditemukan"] }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        code: result.data.code,
        fullName: result.data.fullName,
        email: result.data.email,
        phone: result.data.phone || null,
        address: result.data.address || null,
        hireDate: new Date(result.data.hireDate),
        status: result.data.status,
        baseSalary: result.data.baseSalary,
        departmentId: result.data.departmentId,
        positionId: result.data.positionId,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
    });

    return successResponse(
      { ...employee, baseSalary: Number(employee.baseSalary) },
      201
    );
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return errorResponse("Gagal membuat karyawan");
  }
}
