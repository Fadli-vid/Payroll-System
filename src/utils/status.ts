// Varian Badge untuk berbagai status — satu sumber untuk semua halaman.

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function getAttendanceStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PRESENT":
      return "default";
    case "LATE":
      return "secondary";
    case "LEAVE":
    case "SICK":
    case "VACATION":
      return "outline";
    case "ABSENT":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getEmployeeStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INACTIVE":
      return "secondary";
    case "RESIGNED":
      return "outline";
    case "TERMINATED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getPayrollStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PAID":
      return "default";
    case "APPROVED":
      return "secondary";
    case "DRAFT":
      return "outline";
    default:
      return "secondary";
  }
}
