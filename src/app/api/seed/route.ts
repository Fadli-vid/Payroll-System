import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

/**
 * GET /api/seed — Seed database with CSV dataset from Payroll Case Study
 *
 * Dataset mapping (CSV → Prisma Schema):
 *
 * DEPARTMENTS: Derived from jabatan groupings in dataset
 *   - Finance & Accounting (Staff Accounting, Staff Finance, Manager F&A, SPV F&A)
 *   - Human Resources (Staff HRD, Manager HRD)
 *   - Sales & Marketing (Sales, SPV Sales)
 *
 * POSITIONS: Mapped directly from "JABATAN" column
 *   - Staff Accounting, Staff Finance, Manager F&A, SPV F&A,
 *     Staff HRD, Manager HRD, Sales, SPV Sales
 *
 * ALLOWANCES (master): Tunjangan dari dataset (hanya yang ada di schema)
 *   - Tunjangan Jabatan (5% dari gaji pokok — sesuai dataset)
 *
 * DEDUCTIONS (master): Potongan dari dataset
 *   - BPJS Kesehatan (1% gaji pokok)
 *   - BPJS TK - JHT (2% gaji pokok)
 *   - BPJS TK - JKK (1% gaji pokok)
 *   - BPJS TK - JPN (1% gaji pokok)
 *
 * EMPLOYEES: 10 karyawan dari "Data Karyawan.csv"
 * ATTENDANCE: 31 hari (Juli 2018) per karyawan dari "Absensi.csv"
 * PAYROLL: Periode Juli 2018 dari "Gaji.csv"
 * PAYROLL DETAILS: Breakdown komponen gaji dari "Contoh Slip Gaji.csv"
 *
 * Data kategori di dataset yang TIDAK ada di schema (diabaikan):
 *   - Status Perkawinan (K/1, TK/0, etc) → tidak ada kolom di Employee
 *   - REK BANK, NAMA BANK → tidak ada kolom di Employee
 *   - BPJS TK - JKM → nilainya 0 di semua karyawan, diabaikan
 *   - PPH 21 → tidak ada master deduction terpisah
 *
 * Kolom di schema yang TIDAK ada di dataset (diisi fiktif):
 *   - Employee.email → generated: nama.lowercase@talenta.co
 *   - Employee.phone → generated: 08xx
 *   - Employee.address → generated: fiktif Jakarta
 */

export async function GET() {
  try {
    console.log("🌱 Seeding database with CSV dataset...");

    // ═══════════════════════════════════════════════════════
    // 0. CLEAN EXISTING DATA (in dependency order)
    // ═══════════════════════════════════════════════════════
    await prisma.payrollDetail.deleteMany();
    await prisma.payroll.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.employeeAllowance.deleteMany();
    await prisma.employeeDeduction.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.allowance.deleteMany();
    await prisma.deduction.deleteMany();
    await prisma.position.deleteMany();
    await prisma.department.deleteMany();

    // ═══════════════════════════════════════════════════════
    // 1. DEPARTMENTS
    // ═══════════════════════════════════════════════════════
    const deptFA = await prisma.department.create({
      data: {
        name: "Finance & Accounting",
        description: "Departemen Keuangan & Akuntansi",
      },
    });
    const deptHRD = await prisma.department.create({
      data: {
        name: "Human Resources",
        description: "Departemen Sumber Daya Manusia",
      },
    });
    const deptSales = await prisma.department.create({
      data: {
        name: "Sales & Marketing",
        description: "Departemen Penjualan & Pemasaran",
      },
    });

    // ═══════════════════════════════════════════════════════
    // 2. POSITIONS (from JABATAN column in dataset)
    // ═══════════════════════════════════════════════════════
    const posStaffAccounting = await prisma.position.create({
      data: { name: "Staff Accounting", baseAllowance: 0, description: "Staff bagian akuntansi" },
    });
    const posStaffFinance = await prisma.position.create({
      data: { name: "Staff Finance", baseAllowance: 0, description: "Staff bagian keuangan" },
    });
    const posManagerFA = await prisma.position.create({
      data: { name: "Manager F&A", baseAllowance: 500000, description: "Manajer Finance & Accounting" },
    });
    const posSPVFA = await prisma.position.create({
      data: { name: "SPV F&A", baseAllowance: 0, description: "Supervisor Finance & Accounting" },
    });
    const posStaffHRD = await prisma.position.create({
      data: { name: "Staff HRD", baseAllowance: 0, description: "Staff bagian HRD" },
    });
    const posManagerHRD = await prisma.position.create({
      data: { name: "Manager HRD", baseAllowance: 500000, description: "Manajer departemen HRD" },
    });
    const posSales = await prisma.position.create({
      data: { name: "Sales", baseAllowance: 0, description: "Staff penjualan" },
    });
    const posSPVSales = await prisma.position.create({
      data: { name: "SPV Sales", baseAllowance: 0, description: "Supervisor tim penjualan" },
    });

    // ═══════════════════════════════════════════════════════
    // 3. MASTER ALLOWANCES
    // ═══════════════════════════════════════════════════════
    const allowTunjJabatan = await prisma.allowance.create({
      data: { name: "Tunjangan Jabatan", amount: 500000, description: "Tunjangan jabatan manajerial", isActive: true },
    });

    // ═══════════════════════════════════════════════════════
    // 4. MASTER DEDUCTIONS
    // ═══════════════════════════════════════════════════════
    const dedBPJSKS = await prisma.deduction.create({
      data: { name: "BPJS Kesehatan", amount: 45000, description: "Potongan BPJS Kesehatan (1% gaji pokok)", isActive: true },
    });
    const dedBPJSJHT = await prisma.deduction.create({
      data: { name: "BPJS TK - JHT", amount: 90000, description: "Jaminan Hari Tua (2% gaji pokok)", isActive: true },
    });
    const dedBPJSJKK = await prisma.deduction.create({
      data: { name: "BPJS TK - JKK", amount: 45000, description: "Jaminan Kecelakaan Kerja (1% gaji pokok)", isActive: true },
    });
    const dedBPJSJPN = await prisma.deduction.create({
      data: { name: "BPJS TK - JPN", amount: 45000, description: "Jaminan Pensiun (1% gaji pokok)", isActive: true },
    });

    // ═══════════════════════════════════════════════════════
    // 5. EMPLOYEES (from Data Karyawan.csv)
    // ═══════════════════════════════════════════════════════
    interface EmpData {
      code: string;
      fullName: string;
      email: string;
      phone: string;
      address: string;
      baseSalary: number;
      tunjangan: number;
      departmentId: string;
      positionId: string;
      overtimePay: number;
      allowanceTotal: number;
      deductionTotal: number;
      netSalary: number;
      tunJabatan: number;
      bpjsKS: number;
      bpjsJHT: number;
      bpjsJKK: number;
      bpjsJPN: number;
      pph21: number;
    }

    const employeesData: EmpData[] = [
      {
        code: "CN-001", fullName: "DONO",
        email: "dono@talenta.co", phone: "081200000001",
        address: "Jl. Merdeka No. 1, Jakarta Pusat",
        baseSalary: 4500000, tunjangan: 0,
        departmentId: deptFA.id, positionId: posStaffAccounting.id,
        overtimePay: 1085983, allowanceTotal: 0,
        deductionTotal: 504299, netSalary: 5081684,
        tunJabatan: 279299, bpjsKS: 45000, bpjsJHT: 90000, bpjsJKK: 45000, bpjsJPN: 45000, pph21: 0,
      },
      {
        code: "CN-002", fullName: "KASINO",
        email: "kasino@talenta.co", phone: "081200000002",
        address: "Jl. Sudirman No. 12, Jakarta Selatan",
        baseSalary: 4500000, tunjangan: 0,
        departmentId: deptFA.id, positionId: posStaffFinance.id,
        overtimePay: 1085983, allowanceTotal: 0,
        deductionTotal: 514633, netSalary: 5071350,
        tunJabatan: 279299, bpjsKS: 45000, bpjsJHT: 90000, bpjsJKK: 45000, bpjsJPN: 45000, pph21: 10334,
      },
      {
        code: "CN-003", fullName: "INDRO",
        email: "indro@talenta.co", phone: "081200000003",
        address: "Jl. Gatot Subroto No. 8, Jakarta Selatan",
        baseSalary: 9000000, tunjangan: 500000,
        departmentId: deptFA.id, positionId: posManagerFA.id,
        overtimePay: 2171965, allowanceTotal: 500000,
        deductionTotal: 1233128, netSalary: 10438837,
        tunJabatan: 500000, bpjsKS: 80000, bpjsJHT: 180000, bpjsJKK: 90000, bpjsJPN: 90000, pph21: 293128,
      },
      {
        code: "CN-004", fullName: "EIKICHI ONIZUKA",
        email: "eikichi.onizuka@talenta.co", phone: "081200000004",
        address: "Jl. Thamrin No. 45, Jakarta Pusat",
        baseSalary: 6000000, tunjangan: 0,
        departmentId: deptFA.id, positionId: posSPVFA.id,
        overtimePay: 1447977, allowanceTotal: 0,
        deductionTotal: 786178, netSalary: 6661799,
        tunJabatan: 372399, bpjsKS: 60000, bpjsJHT: 120000, bpjsJKK: 60000, bpjsJPN: 60000, pph21: 113779,
      },
      {
        code: "CN-005", fullName: "DADAN DANIRA",
        email: "dadan.danira@talenta.co", phone: "081200000005",
        address: "Jl. Rasuna Said No. 3, Jakarta Selatan",
        baseSalary: 4000000, tunjangan: 0,
        departmentId: deptHRD.id, positionId: posStaffHRD.id,
        overtimePay: 965318, allowanceTotal: 0,
        deductionTotal: 448266, netSalary: 4517052,
        tunJabatan: 248266, bpjsKS: 40000, bpjsJHT: 80000, bpjsJKK: 40000, bpjsJPN: 40000, pph21: 0,
      },
      {
        code: "CN-006", fullName: "HATAKE KAKASHI",
        email: "hatake.kakashi@talenta.co", phone: "081200000006",
        address: "Jl. Kuningan No. 7, Jakarta Selatan",
        baseSalary: 4000000, tunjangan: 0,
        departmentId: deptHRD.id, positionId: posStaffHRD.id,
        overtimePay: 965318, allowanceTotal: 0,
        deductionTotal: 449119, netSalary: 4516199,
        tunJabatan: 248266, bpjsKS: 40000, bpjsJHT: 80000, bpjsJKK: 40000, bpjsJPN: 40000, pph21: 853,
      },
      {
        code: "CN-007", fullName: "NOBI NOBITA",
        email: "nobi.nobita@talenta.co", phone: "081200000007",
        address: "Jl. HR Rasuna Said Kav. 10, Jakarta Selatan",
        baseSalary: 9000000, tunjangan: 500000,
        departmentId: deptHRD.id, positionId: posManagerHRD.id,
        overtimePay: 2171965, allowanceTotal: 500000,
        deductionTotal: 1289378, netSalary: 10382587,
        tunJabatan: 500000, bpjsKS: 80000, bpjsJHT: 180000, bpjsJKK: 90000, bpjsJPN: 90000, pph21: 349378,
      },
      {
        code: "CN-008", fullName: "DINAR AMALA",
        email: "dinar.amala@talenta.co", phone: "081200000008",
        address: "Jl. Kemang Raya No. 22, Jakarta Selatan",
        baseSalary: 3750000, tunjangan: 0,
        departmentId: deptSales.id, positionId: posSales.id,
        overtimePay: 904986, allowanceTotal: 0,
        deductionTotal: 420249, netSalary: 4234737,
        tunJabatan: 232749, bpjsKS: 37500, bpjsJHT: 75000, bpjsJKK: 37500, bpjsJPN: 37500, pph21: 0,
      },
      {
        code: "CN-009", fullName: "GODA TAKESHI",
        email: "goda.takeshi@talenta.co", phone: "081200000009",
        address: "Jl. Tebet Raya No. 15, Jakarta Selatan",
        baseSalary: 3750000, tunjangan: 0,
        departmentId: deptSales.id, positionId: posSales.id,
        overtimePay: 904986, allowanceTotal: 0,
        deductionTotal: 420249, netSalary: 4234737,
        tunJabatan: 232749, bpjsKS: 37500, bpjsJHT: 75000, bpjsJKK: 37500, bpjsJPN: 37500, pph21: 0,
      },
      {
        code: "CN-010", fullName: "NILA SADANI",
        email: "nila.sadani@talenta.co", phone: "081200000010",
        address: "Jl. Cikini Raya No. 55, Jakarta Pusat",
        baseSalary: 4000000, tunjangan: 0,
        departmentId: deptSales.id, positionId: posSPVSales.id,
        overtimePay: 965318, allowanceTotal: 0,
        deductionTotal: 448266, netSalary: 4517052,
        tunJabatan: 248266, bpjsKS: 40000, bpjsJHT: 80000, bpjsJKK: 40000, bpjsJPN: 40000, pph21: 0,
      },
    ];

    const createdEmployees: { id: string; data: EmpData }[] = [];

    for (const emp of employeesData) {
      const created = await prisma.employee.create({
        data: {
          code: emp.code,
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          address: emp.address,
          hireDate: new Date("2018-01-02"),
          status: "ACTIVE",
          baseSalary: emp.baseSalary,
          departmentId: emp.departmentId,
          positionId: emp.positionId,
        },
      });
      createdEmployees.push({ id: created.id, data: emp });
    }

    // ═══════════════════════════════════════════════════════
    // 6. ASSIGN ALLOWANCES & DEDUCTIONS
    // ═══════════════════════════════════════════════════════
    for (const emp of createdEmployees) {
      // Only assign Tunjangan Jabatan to employees who have tunjangan > 0
      if (emp.data.tunjangan > 0) {
        await prisma.employeeAllowance.create({
          data: { employeeId: emp.id, allowanceId: allowTunjJabatan.id },
        });
      }

      // All employees get all 4 deductions
      await prisma.employeeDeduction.createMany({
        data: [
          { employeeId: emp.id, deductionId: dedBPJSKS.id },
          { employeeId: emp.id, deductionId: dedBPJSJHT.id },
          { employeeId: emp.id, deductionId: dedBPJSJKK.id },
          { employeeId: emp.id, deductionId: dedBPJSJPN.id },
        ],
      });
    }

    // ═══════════════════════════════════════════════════════
    // 7. ATTENDANCE (Juli 2018 — 31 days, same pattern for all employees)
    //    From Absensi.csv: All employees have identical attendance
    // ═══════════════════════════════════════════════════════

    // Daily attendance data extracted from CSV (1-Jul to 31-Jul 2018)
    interface DayAttendance {
      day: number;
      dayName: string;
      holiday: boolean;
      checkIn: string | null;
      checkOut: string | null;
      workingHours: number;
      overtimeHours: number;
    }

    const julyAttendance: DayAttendance[] = [
      { day: 1,  dayName: "Sunday",    holiday: false, checkIn: null,   checkOut: null,   workingHours: 0,     overtimeHours: 0 },
      { day: 2,  dayName: "Monday",    holiday: true,  checkIn: "08:00", checkOut: "13:00", workingHours: 5,     overtimeHours: 8 },
      { day: 3,  dayName: "Tuesday",   holiday: false, checkIn: "08:00", checkOut: "19:00", workingHours: 11,    overtimeHours: 3.50 },
      { day: 4,  dayName: "Wednesday", holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 5,  dayName: "Thursday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 6,  dayName: "Friday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 7,  dayName: "Saturday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 8,  dayName: "Sunday",    holiday: false, checkIn: "08:00", checkOut: "22:00", workingHours: 14,    overtimeHours: 9.50 },
      { day: 9,  dayName: "Monday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 10, dayName: "Tuesday",   holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 11, dayName: "Wednesday", holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 12, dayName: "Thursday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 13, dayName: "Friday",    holiday: true,  checkIn: "08:00", checkOut: "11:00", workingHours: 3,     overtimeHours: 6 },
      { day: 14, dayName: "Saturday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 15, dayName: "Sunday",    holiday: false, checkIn: null,   checkOut: null,   workingHours: 0,     overtimeHours: 0 },
      { day: 16, dayName: "Monday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 17, dayName: "Tuesday",   holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 18, dayName: "Wednesday", holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 19, dayName: "Thursday",  holiday: true,  checkIn: "08:00", checkOut: "16:00", workingHours: 8,     overtimeHours: 14 },
      { day: 20, dayName: "Friday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 21, dayName: "Saturday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 22, dayName: "Sunday",    holiday: false, checkIn: null,   checkOut: null,   workingHours: 0,     overtimeHours: 0 },
      { day: 23, dayName: "Monday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 24, dayName: "Tuesday",   holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 25, dayName: "Wednesday", holiday: false, checkIn: "08:00", checkOut: "17:30", workingHours: 9.50,  overtimeHours: 0.75 },
      { day: 26, dayName: "Thursday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 27, dayName: "Friday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 28, dayName: "Saturday",  holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 29, dayName: "Sunday",    holiday: false, checkIn: null,   checkOut: null,   workingHours: 0,     overtimeHours: 0 },
      { day: 30, dayName: "Monday",    holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
      { day: 31, dayName: "Tuesday",   holiday: false, checkIn: "08:00", checkOut: "17:00", workingHours: 9,     overtimeHours: 0 },
    ];

    let attendanceCount = 0;
    for (const emp of createdEmployees) {
      for (const day of julyAttendance) {
        const dateStr = `2018-07-${String(day.day).padStart(2, "0")}`;
        const isSunday = day.dayName === "Sunday";
        const noWork = !day.checkIn;

        let status: "PRESENT" | "LATE" | "LEAVE" | "SICK" | "VACATION" | "ABSENT" = "PRESENT";
        if (noWork && isSunday) {
          status = "LEAVE"; // Day off
        } else if (noWork) {
          status = "ABSENT";
        } else if (day.holiday) {
          status = "PRESENT"; // Holiday but still worked = lembur
        }

        let checkInDT: Date | null = null;
        let checkOutDT: Date | null = null;
        if (day.checkIn) {
          const [h, m] = day.checkIn.split(":").map(Number);
          checkInDT = new Date(2018, 6, day.day, h, m, 0);
        }
        if (day.checkOut) {
          const [h, m] = day.checkOut.split(":").map(Number);
          checkOutDT = new Date(2018, 6, day.day, h, m, 0);
        }

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: new Date(dateStr),
            status,
            checkIn: checkInDT,
            checkOut: checkOutDT,
            lateMinutes: 0,
            overtimeHours: day.overtimeHours,
            workingHours: day.workingHours,
            notes: day.holiday ? "Hari Libur Nasional (tetap masuk)" : null,
          },
        });
        attendanceCount++;
      }
    }

    // ═══════════════════════════════════════════════════════
    // 8. PAYROLL (Juli 2018) + PAYROLL DETAILS
    // ═══════════════════════════════════════════════════════
    let payrollCount = 0;
    let detailCount = 0;

    for (const emp of createdEmployees) {
      const d = emp.data;

      const payroll = await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          month: 7,
          year: 2018,
          basicSalary: d.baseSalary,
          allowanceTotal: d.allowanceTotal,
          deductionTotal: d.deductionTotal,
          overtimePay: d.overtimePay,
          bonus: 0,
          netSalary: d.netSalary,
          status: "PAID",
        },
      });
      payrollCount++;

      // Payroll Details — EARNINGS
      const earningDetails: { component: string; amount: number; description: string }[] = [
        { component: "Gaji Pokok", amount: d.baseSalary, description: "Gaji pokok bulanan" },
        { component: "Lembur", amount: d.overtimePay, description: "Upah lembur 41.75 jam" },
      ];

      if (d.tunjangan > 0) {
        earningDetails.push({ component: "Tunjangan", amount: d.tunjangan, description: "Tunjangan jabatan manajerial" });
      }

      for (const detail of earningDetails) {
        await prisma.payrollDetail.create({
          data: {
            payrollId: payroll.id,
            component: detail.component,
            type: "EARNING",
            amount: detail.amount,
            description: detail.description,
          },
        });
        detailCount++;
      }

      // Payroll Details — DEDUCTIONS
      const deductionDetails: { component: string; amount: number; description: string }[] = [
        { component: "Tunjangan Jabatan (Potongan)", amount: d.tunJabatan, description: "Potongan tunjangan jabatan" },
        { component: "BPJS Kesehatan", amount: d.bpjsKS, description: "BPJS Kesehatan 1% gaji pokok" },
        { component: "BPJS TK - JHT", amount: d.bpjsJHT, description: "Jaminan Hari Tua 2% gaji pokok" },
        { component: "BPJS TK - JKK", amount: d.bpjsJKK, description: "Jaminan Kecelakaan Kerja 1% gaji pokok" },
        { component: "BPJS TK - JPN", amount: d.bpjsJPN, description: "Jaminan Pensiun 1% gaji pokok" },
      ];

      if (d.pph21 > 0) {
        deductionDetails.push({ component: "PPH 21", amount: d.pph21, description: "Pajak Penghasilan Pasal 21" });
      }

      for (const detail of deductionDetails) {
        await prisma.payrollDetail.create({
          data: {
            payrollId: payroll.id,
            component: detail.component,
            type: "DEDUCTION",
            amount: detail.amount,
            description: detail.description,
          },
        });
        detailCount++;
      }
    }

    // ═══════════════════════════════════════════════════════
    // RESULT SUMMARY
    // ═══════════════════════════════════════════════════════
    const summary = {
      departments: 3,
      positions: 8,
      allowances: 1,
      deductions: 4,
      employees: 10,
      attendanceRecords: attendanceCount,
      payrolls: payrollCount,
      payrollDetails: detailCount,
    };

    console.log("✅ Seeding complete!", summary);

    return NextResponse.json({
      success: true,
      message: "Migrasi dataset CSV ke database berhasil!",
      summary,
    });
  } catch (error) {
    console.error("❌ Seeding error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal migrasi dataset", error: String(error) },
      { status: 500 }
    );
  }
}
