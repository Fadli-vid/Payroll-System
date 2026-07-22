import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding database on Supabase...");

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
      departmentId: finDept.id,
      positionId: accountantPos.id,
    },
  });

  // 6. Assign Allowances & Deductions
  await prisma.employeeAllowance.upsert({
    where: {
      employeeId_allowanceId: {
        employeeId: emp1.id,
        allowanceId: makanAllow.id,
      },
    },
    update: {},
    create: {
      employeeId: emp1.id,
      allowanceId: makanAllow.id,
    },
  });

  await prisma.employeeAllowance.upsert({
    where: {
      employeeId_allowanceId: {
        employeeId: emp1.id,
        allowanceId: transportAllow.id,
      },
    },
    update: {},
    create: {
      employeeId: emp1.id,
      allowanceId: transportAllow.id,
    },
  });

  await prisma.employeeDeduction.upsert({
    where: {
      employeeId_deductionId: {
        employeeId: emp1.id,
        deductionId: bpjsKes.id,
      },
    },
    update: {},
    create: {
      employeeId: emp1.id,
      deductionId: bpjsKes.id,
    },
  });

  await prisma.employeeDeduction.upsert({
    where: {
      employeeId_deductionId: {
        employeeId: emp1.id,
        deductionId: bpjsTk.id,
      },
    },
    update: {},
    create: {
      employeeId: emp1.id,
      deductionId: bpjsTk.id,
    },
  });

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
