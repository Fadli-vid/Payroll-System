import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding database on Supabase...");

  const defaultPasswordHash = await bcrypt.hash("123456", 10);

  // 1. Create Departments
  const hrDept = await prisma.department.upsert({
    where: { name: "Human Resources" },
    update: {},
    create: {
      name: "Human Resources",
      description: "Manajemen SDM dan Personalia",
    },
  });

  const engDept = await prisma.department.upsert({
    where: { name: "Engineering & Tech" },
    update: {},
    create: {
      name: "Engineering & Tech",
      description: "Pengembangan Perangkat Lunak dan IT",
    },
  });

  const finDept = await prisma.department.upsert({
    where: { name: "Finance & Accounting" },
    update: {},
    create: {
      name: "Finance & Accounting",
      description: "Manajemen Keuangan dan Pembukuan",
    },
  });

  // 2. Create Positions
  const managerPos = await prisma.position.upsert({
    where: { name: "Manager HRD" },
    update: {},
    create: {
      name: "Manager HRD",
      baseAllowance: 2500000,
      description: "Manajer Departemen HRD",
    },
  });

  const srDevPos = await prisma.position.upsert({
    where: { name: "Senior Software Engineer" },
    update: {},
    create: {
      name: "Senior Software Engineer",
      baseAllowance: 3000000,
      description: "Pengembang Aplikasi Senior",
    },
  });

  const accountantPos = await prisma.position.upsert({
    where: { name: "Staff Akuntansi" },
    update: {},
    create: {
      name: "Staff Akuntansi",
      baseAllowance: 1500000,
      description: "Staff Pengelola Keuangan",
    },
  });

  // 3. Create Master Allowances
  const makanAllow = await prisma.allowance.upsert({
    where: { name: "Tunjangan Makan" },
    update: {},
    create: {
      name: "Tunjangan Makan",
      amount: 750000,
      description: "Uang makan bulanan",
      isActive: true,
    },
  });

  const transportAllow = await prisma.allowance.upsert({
    where: { name: "Tunjangan Transportasi" },
    update: {},
    create: {
      name: "Tunjangan Transportasi",
      amount: 500000,
      description: "Uang transportasi operasional",
      isActive: true,
    },
  });

  // 4. Create Master Deductions
  const bpjsKes = await prisma.deduction.upsert({
    where: { name: "BPJS Kesehatan" },
    update: {},
    create: {
      name: "BPJS Kesehatan",
      amount: 150000,
      description: "Potongan wajib BPJS Kesehatan",
      isActive: true,
    },
  });

  const bpjsTk = await prisma.deduction.upsert({
    where: { name: "BPJS Ketenagakerjaan" },
    update: {},
    create: {
      name: "BPJS Ketenagakerjaan",
      amount: 200000,
      description: "Potongan wajib BPJS Ketenagakerjaan",
      isActive: true,
    },
  });

  // 5. Create Employees
  const emp1 = await prisma.employee.upsert({
    where: { code: "EMP-001" },
    update: {},
    create: {
      code: "EMP-001",
      fullName: "Budi Santoso",
      email: "budi.santoso@payroll.id",
      phone: "081234567890",
      hireDate: new Date("2023-01-15"),
      status: "ACTIVE",
      baseSalary: 12000000,
      password: defaultPasswordHash,
      departmentId: engDept.id,
      positionId: srDevPos.id,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { code: "EMP-002" },
    update: {},
    create: {
      code: "EMP-002",
      fullName: "Siti Rahmawati",
      email: "siti.rahmawati@payroll.id",
      phone: "081298765432",
      hireDate: new Date("2023-03-01"),
      status: "ACTIVE",
      baseSalary: 9500000,
      password: defaultPasswordHash,
      departmentId: hrDept.id,
      positionId: managerPos.id,
    },
  });

  const emp3 = await prisma.employee.upsert({
    where: { code: "EMP-003" },
    update: {},
    create: {
      code: "EMP-003",
      fullName: "Ahmad Fauzi",
      email: "ahmad.fauzi@payroll.id",
      phone: "081377889900",
      hireDate: new Date("2023-06-10"),
      status: "ACTIVE",
      baseSalary: 7000000,
      password: defaultPasswordHash,
      departmentId: finDept.id,
      positionId: accountantPos.id,
    },
  });

  // 6. Assign Allowances & Deductions ke semua karyawan
  // (mencerminkan perilaku auto-link saat karyawan dibuat lewat API; engine
  // payroll kini membaca tunjangan/potongan HANYA dari junction table)
  const employees = [emp1, emp2, emp3];
  await prisma.employeeAllowance.createMany({
    data: employees.flatMap((emp) => [
      { employeeId: emp.id, allowanceId: makanAllow.id },
      { employeeId: emp.id, allowanceId: transportAllow.id },
    ]),
    skipDuplicates: true,
  });
  await prisma.employeeDeduction.createMany({
    data: employees.flatMap((emp) => [
      { employeeId: emp.id, deductionId: bpjsKes.id },
      { employeeId: emp.id, deductionId: bpjsTk.id },
    ]),
    skipDuplicates: true,
  });

  // 7. Default Penalty Settings (sama dengan /api/seed)
  if ((await prisma.penaltySetting.count()) === 0) {
    await prisma.penaltySetting.createMany({
      data: [
        { type: "LATE", mode: "FIXED", value: 0, minMinutes: 0, maxMinutes: 10, description: "Toleransi (tanpa denda)", isActive: true },
        { type: "LATE", mode: "FIXED", value: 10000, minMinutes: 11, maxMinutes: 30, description: "Terlambat ringan", isActive: true },
        { type: "LATE", mode: "FIXED", value: 25000, minMinutes: 31, maxMinutes: 60, description: "Terlambat sedang", isActive: true },
        { type: "ABSENT", mode: "PERCENTAGE", value: 4.55, minMinutes: 0, maxMinutes: null, description: "≈ 1/22 gaji pokok per hari absen", isActive: true },
      ],
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
