"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Stethoscope,
  XCircle,
  HelpCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { formatTime } from "@/src/utils/format";

// ─── Interfaces ──────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "LATE" | "LEAVE" | "SICK" | "VACATION" | "ABSENT";
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  overtimeHours: number;
  workingHours: number;
  notes: string | null;
}

interface Summary {
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  sickCount: number;
  vacationCount: number;
  absentCount: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PRESENT: { label: "Hadir", bgClass: "bg-emerald-500/15 border-emerald-500/30", textClass: "text-emerald-700 dark:text-emerald-400", badgeVariant: "default" },
  LATE: { label: "Terlambat", bgClass: "bg-amber-500/15 border-amber-500/30", textClass: "text-amber-700 dark:text-amber-400", badgeVariant: "secondary" },
  LEAVE: { label: "Cuti", bgClass: "bg-blue-500/15 border-blue-500/30", textClass: "text-blue-700 dark:text-blue-400", badgeVariant: "outline" },
  SICK: { label: "Sakit", bgClass: "bg-purple-500/15 border-purple-500/30", textClass: "text-purple-700 dark:text-purple-400", badgeVariant: "outline" },
  VACATION: { label: "Libur", bgClass: "bg-teal-500/15 border-teal-500/30", textClass: "text-teal-700 dark:text-teal-400", badgeVariant: "outline" },
  ABSENT: { label: "Alpa", bgClass: "bg-red-500/15 border-red-500/30", textClass: "text-red-700 dark:text-red-400", badgeVariant: "destructive" },
};

export default function EmployeeAttendancePage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Attendance Data
  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await axios.get("/api/employee/attendance", {
        params: { month, year },
      });
      if (res.success && res.data) {
        setRecords(res.data.records || []);
        setSummary(res.data.summary || null);
      }
    } catch {
      toast.error("Gagal mengambil data kehadiran");
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Calendar Math
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun

  // Create lookup map date -> AttendanceRecord
  const recordMap = new Map<number, AttendanceRecord>();
  for (const r of records) {
    const d = new Date(r.date).getUTCDate();
    recordMap.set(d, r);
  }

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Kehadiran Saya
          </h2>
          <p className="text-muted-foreground">
            Tampilan kalender bulanan status kehadiran dan rekapan presensi pribadi Anda.
          </p>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue>{MONTH_NAMES[month - 1]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue>{year}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Hadir</span>
            </div>
            <div className="text-xl font-bold mt-1">{summary.presentCount} Hari</div>
          </Card>

          <Card className="p-3 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Terlambat</span>
            </div>
            <div className="text-xl font-bold mt-1">
              {summary.lateCount} Hari{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({summary.totalLateMinutes} mnt)
              </span>
            </div>
          </Card>

          <Card className="p-3 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Cuti</span>
            </div>
            <div className="text-xl font-bold mt-1">{summary.leaveCount} Hari</div>
          </Card>

          <Card className="p-3 border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400">
              <Stethoscope className="h-4 w-4" />
              <span>Sakit</span>
            </div>
            <div className="text-xl font-bold mt-1">{summary.sickCount} Hari</div>
          </Card>

          <Card className="p-3 border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span>Alpa</span>
            </div>
            <div className="text-xl font-bold mt-1">{summary.absentCount} Hari</div>
          </Card>

          <Card className="p-3 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Clock className="h-4 w-4" />
              <span>Total Lembur</span>
            </div>
            <div className="text-xl font-bold mt-1">{summary.totalOvertimeHours} Jam</div>
          </Card>
        </div>
      )}

      {/* Monthly Calendar View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>
              Kalender Kehadiran &mdash; {MONTH_NAMES[month - 1]} {year}
            </span>
            <div className="flex items-center gap-3 text-xs font-normal">
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Hadir
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Terlambat
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Cuti/Sakit
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Alpa
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            Informasi presensi diinput dan dikelola resmi oleh Administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Memuat kalender kehadiran...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Day Headers */}
              {DAY_NAMES.map((day, idx) => (
                <div
                  key={day}
                  className={`text-center font-bold text-xs py-2 border-b ${
                    idx === 0 ? "text-red-500" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Empty leading offset cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="min-h-[85px] sm:min-h-[100px] rounded-lg bg-muted/20 border border-transparent" />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNumber = idx + 1;
                const rec = recordMap.get(dayNumber);
                const isSunday = (firstDayOfWeek + idx) % 7 === 0;

                const cfg = rec ? STATUS_CONFIG[rec.status] : null;

                return (
                  <div
                    key={`day-${dayNumber}`}
                    className={`min-h-[85px] sm:min-h-[100px] p-1.5 sm:p-2 rounded-lg border transition-all flex flex-col justify-between ${
                      cfg
                        ? cfg.bgClass
                        : isSunday
                        ? "bg-red-500/5 border-red-500/10"
                        : "bg-card border-border/60 hover:border-primary/40"
                    }`}
                  >
                    {/* Day number & Status badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSunday ? "text-red-500" : "text-foreground"
                        }`}
                      >
                        {dayNumber}
                      </span>
                      {rec && cfg && (
                        <Badge variant={cfg.badgeVariant} className="text-[10px] px-1 py-0 h-4">
                          {cfg.label}
                        </Badge>
                      )}
                    </div>

                    {/* Check In / Out info */}
                    {rec ? (
                      <div className="space-y-0.5 text-[11px]">
                        {rec.checkIn && (
                          <div className="text-muted-foreground truncate">
                            In: <span className="font-semibold text-foreground">{formatTime(rec.checkIn)}</span>
                          </div>
                        )}
                        {rec.checkOut && (
                          <div className="text-muted-foreground truncate">
                            Out: <span className="font-semibold text-foreground">{formatTime(rec.checkOut)}</span>
                          </div>
                        )}
                        {rec.lateMinutes > 0 && (
                          <div className="text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                            + {rec.lateMinutes} mnt
                          </div>
                        )}
                        {rec.overtimeHours > 0 && (
                          <div className="text-primary font-semibold text-[10px]">
                            Lembur {rec.overtimeHours}j
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground italic">
                        {isSunday ? "Libur Akhir Pekan" : "Tidak ada data"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
