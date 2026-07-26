import { WORKING_HOURS, LATE_ABSENT_THRESHOLD } from "@/src/lib/constants";

/**
 * Parse a time string "HH:mm" into total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Calculate attendance metrics from check-in / check-out times ("HH:mm").
 */
export function calculateAttendanceMetrics(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
) {
  let lateMinutes = 0;
  let workingHours = 0;
  let overtimeHours = 0;
  let autoStatus: string | null = null;

  const startMinutes = timeToMinutes(WORKING_HOURS.START); // 08:00 → 480
  const endMinutes = timeToMinutes(WORKING_HOURS.END); // 17:00 → 1020

  if (checkIn) {
    const checkInMinutes = timeToMinutes(checkIn);
    if (checkInMinutes > startMinutes) {
      lateMinutes = checkInMinutes - startMinutes;
    }

    // Auto-mark absent if late > threshold
    if (lateMinutes > LATE_ABSENT_THRESHOLD) {
      autoStatus = "ABSENT";
    } else if (lateMinutes > 0) {
      autoStatus = "LATE";
    }

    if (checkOut) {
      const checkOutMinutes = timeToMinutes(checkOut);
      const workedMinutes = Math.max(0, checkOutMinutes - checkInMinutes);
      workingHours = Math.round((workedMinutes / 60) * 100) / 100;

      // Overtime: any work beyond the standard end time
      if (checkOutMinutes > endMinutes) {
        const otMinutes = checkOutMinutes - endMinutes;
        overtimeHours = Math.round((otMinutes / 60) * 100) / 100;
      }
    }
  }

  return { lateMinutes, workingHours, overtimeHours, autoStatus };
}

/**
 * Build a wall-clock DateTime anchored in UTC for an attendance date + "HH:mm".
 * Contract: clients must render these with getUTCHours()/getUTCMinutes().
 */
export function toUtcDateTime(dateStr: string, time: string | null): Date | null {
  return time ? new Date(`${dateStr}T${time}:00Z`) : null;
}
