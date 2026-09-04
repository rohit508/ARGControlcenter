import { env } from "../../env";
import { ApiError } from "../../middleware/errorHandler.middleware";
import jwt from "jsonwebtoken";

type UnknownRecord = Record<string, unknown>;

type AttendanceRow = {
  id: number;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string;
  departmentId: number | null;
  department: string;
  activity: string;
  attendanceDate: string | null;
  attendanceTime: string | null;
  attendanceOutTime: string | null;
  overtimeMinutes: number;
};

type LeaveRow = {
  id: number;
  employeeName: string;
  employeeCode: string;
  leaveType: string;
  fromDate: string | null;
  tillDate: string | null;
  status: string;
};

export type DashboardPeriod = "week" | "month" | "quarter" | "year";

const read = (row: UnknownRecord, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  return undefined;
};
const text = (value: unknown) => value == null ? "" : String(value).trim();
const numberOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const dateOnly = (value: unknown) => {
  const raw = text(value);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
};

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function getPeriodRange(period: DashboardPeriod, requestedStartDate?: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayValue = today.toISOString().slice(0, 10);
  if (requestedStartDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedStartDate) && requestedStartDate <= todayValue) {
    return { fromDate: requestedStartDate, tillDate: todayValue };
  }
  const fromDate = new Date(today);

  if (period === "week") fromDate.setUTCDate(fromDate.getUTCDate() - ((fromDate.getUTCDay() + 6) % 7));
  if (period === "month") fromDate.setUTCDate(1);
  if (period === "quarter") {
    fromDate.setUTCMonth(Math.floor(fromDate.getUTCMonth() / 3) * 3, 1);
  }
  if (period === "year") fromDate.setUTCMonth(0, 1);

  return { fromDate: fromDate.toISOString().slice(0, 10), tillDate: today.toISOString().slice(0, 10) };
}

function activityStatus(activity: string) {
  const normalized = activity.toLowerCase();
  if (normalized.includes("leave")) return "On Leave";
  if (normalized.includes("absent")) return "Absent";
  if (normalized.includes("late") || normalized.includes("tardy")) return "Late";
  return "Present";
}

function asItems(body: unknown): UnknownRecord[] {
  if (Array.isArray(body)) return body.filter((x): x is UnknownRecord => typeof x === "object" && x !== null);
  if (typeof body !== "object" || body === null) return [];
  const record = body as UnknownRecord;
  const items = read(record, "items", "Items", "data", "Data");
  return Array.isArray(items) ? items.filter((x): x is UnknownRecord => typeof x === "object" && x !== null) : [];
}

function responseTotal(body: unknown, fallback: number) {
  if (typeof body !== "object" || body === null) return fallback;
  return numberOrNull(read(body as UnknownRecord, "totalCount", "TotalCount")) ?? fallback;
}

async function getEdxsv2(path: string, entityId?: number | null) {
  // Scope and credentials are loaded at server startup from the local environment.
  if (!env.EDXSV2_API_URL || (!env.EDXSV2_API_TOKEN && !env.EDXSV2_DEV_JWT_SECRET)) {
    throw new ApiError(503, "EDXSV2_NOT_CONFIGURED", "EDXSv2 HR integration has not been configured yet");
  }
  const url = new URL(path.replace(/^\//, ""), `${env.EDXSV2_API_URL.replace(/\/$/, "")}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const token = env.EDXSV2_API_TOKEN ?? jwt.sign(
      { sub: "arg-hr-dashboard", name: "ARG HR Dashboard" },
      env.EDXSV2_DEV_JWT_SECRET!,
      { issuer: env.EDXSV2_JWT_ISSUER, audience: env.EDXSV2_JWT_AUDIENCE, expiresIn: "5m" }
    );
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (env.EDXSV2_CLIENT_ID) headers["X-Client-Id"] = String(env.EDXSV2_CLIENT_ID);
    const scopedEntityId = entityId === undefined ? env.EDXSV2_ENTITY_ID : entityId;
    if (scopedEntityId) headers["X-Entity-Id"] = String(scopedEntityId);
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new ApiError(502, "EDXSV2_REQUEST_FAILED", `EDXSv2 HR request failed (${response.status})`);
    }
    return response.json() as Promise<unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "EDXSV2_UNAVAILABLE", "Unable to reach EDXSv2 HR service");
  } finally {
    clearTimeout(timeout);
  }
}

function mapAttendance(row: UnknownRecord, departmentNames: Map<number, string>): AttendanceRow {
  const departmentId = numberOrNull(read(row, "departmentId", "DepartmentId", "depId", "DepId"));
  const isAbsent = read(row, "isAbsent", "IsAbsent") === true;
  const isHoliday = read(row, "isHoliday", "IsHoliday") === true;
  const lateMinutes = numberOrNull(read(row, "lateMin", "LateMin")) ?? 0;
  const activity = isHoliday ? "Holiday" : isAbsent ? "Absent" : lateMinutes > 0 ? "Late" : "Present";

  return {
    id: numberOrNull(read(row, "id", "Id")) ?? 0,
    employeeId: numberOrNull(read(row, "empId", "EmpId", "employeeId", "EmployeeId")),
    employeeName: text(read(row, "employeeName", "EmployeeName")) || "Unknown employee",
    employeeCode: text(read(row, "employeeCode", "EmployeeCode")),
    departmentId,
    department: (departmentId == null ? "" : departmentNames.get(departmentId)) || "Unassigned",
    activity,
    attendanceDate: dateOnly(read(row, "atnDate", "AtnDate", "attendanceDate", "AttendanceDate")),
    attendanceTime: text(read(row, "actShiftIn", "ActShiftIn", "attendanceTime", "AttendanceTime")) || null,
    attendanceOutTime: text(read(row, "actShiftOut", "ActShiftOut")) || null,
    overtimeMinutes: numberOrNull(read(row, "otMin", "OtMin")) ?? 0,
  };
}

function mapLeave(row: UnknownRecord): LeaveRow {
  return {
    id: numberOrNull(read(row, "id", "Id")) ?? 0,
    employeeName: text(read(row, "employeeName", "EmployeeName")) || "Unknown employee",
    employeeCode: text(read(row, "employeeCode", "EmployeeCode")),
    leaveType: text(read(row, "leaveTypeTxt", "LeaveTypeTxt")) || "Leave",
    fromDate: dateOnly(read(row, "fromDate", "FromDate")),
    tillDate: dateOnly(read(row, "tillDate", "TillDate")),
    status: text(read(row, "statusTxt", "StatusTxt")) || "Unknown",
  };
}

export async function getHrDashboard(period: DashboardPeriod = "month", entityId?: number | null, startDate?: string) {
  const today = isoDate();
  const { fromDate, tillDate } = getPeriodRange(period, startDate);
  const scopedEntityId = entityId === undefined ? env.EDXSV2_ENTITY_ID : entityId;
  const [employeesPayload, attendancePayload, leavePayload, departmentsPayload, holidaysPayload, entitiesPayload] = await Promise.all([
    getEdxsv2("api/HumanResource/EmployeeProfile/v3?pageNumber=1&pageSize=1000", scopedEntityId),
    getEdxsv2(`api/HumanResource/EmployeeDailyAttendance/v3?fromDate=${fromDate}&tillDate=${tillDate}`, scopedEntityId),
    getEdxsv2("api/HumanResource/LeaveRequest/v3?pageNumber=1&pageSize=1000", scopedEntityId),
    getEdxsv2("api/HumanResource/Lookups/v3/departments", scopedEntityId),
    getEdxsv2("api/HumanResource/CalendarHoliday/v3?pageNumber=1&pageSize=100", scopedEntityId),
    getEdxsv2("api/HumanResource/Lookups/v3/entities", null),
  ]);

  const employees = asItems(employeesPayload);
  const departmentNames = new Map(
    asItems(departmentsPayload)
      .map((row) => [numberOrNull(read(row, "id", "Id")), text(read(row, "name", "Name"))] as const)
      .filter((entry): entry is readonly [number, string] => entry[0] != null && Boolean(entry[1]))
  );
  const employeeDirectory = employees
    .map((employee) => {
      const departmentId = numberOrNull(read(employee, "departmentId", "DepartmentId"));
      const firstName = text(read(employee, "firstName", "FirstName"));
      const lastName = text(read(employee, "lastName", "LastName"));
      return {
        id: numberOrNull(read(employee, "id", "Id")) ?? 0,
        employeeName: `${firstName} ${lastName}`.trim() || "Unknown employee",
        employeeCode: text(read(employee, "employeeCode", "EmployeeCode")),
        department: (departmentId == null ? "" : departmentNames.get(departmentId)) || "Unassigned",
        entityId: numberOrNull(read(employee, "entityId", "EntityId")),
      };
    })
    .filter((employee) => employee.id > 0)
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  const attendance = asItems(attendancePayload).map((row) => mapAttendance(row, departmentNames));
  const leaves = asItems(leavePayload).map(mapLeave);
  const payrollProfiles = await Promise.all(employees.map(async (employee) => {
    const employeeId = numberOrNull(read(employee, "id", "Id"));
    if (employeeId == null) return null;
    try {
      return await getEdxsv2(`api/HumanResource/EREmppayroll/v3?employeeId=${employeeId}`, scopedEntityId);
    } catch {
      return null;
    }
  }));
  const todayRows = attendance.filter((row) => row.attendanceDate === today && row.activity !== "Holiday");
  const uniqueToday = new Map<string, AttendanceRow>();
  for (const row of todayRows) {
    const key = row.employeeId == null ? `${row.employeeCode}:${row.employeeName}` : String(row.employeeId);
    const previous = uniqueToday.get(key);
    if (!previous || `${row.attendanceDate ?? ""} ${row.attendanceTime ?? ""}` > `${previous.attendanceDate ?? ""} ${previous.attendanceTime ?? ""}`) uniqueToday.set(key, row);
  }
  const todayAttendance = [...uniqueToday.values()];
  const counts = { Present: 0, Absent: 0, Late: 0, "On Leave": 0 } as Record<string, number>;
  for (const row of todayAttendance) counts[activityStatus(row.activity)]++;

  const trend = Array.from({ length: Math.floor((Date.parse(`${tillDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000) + 1 }, (_, index) => {
    const date = new Date(Date.parse(`${fromDate}T00:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10);
    const seen = new Map<string, AttendanceRow>();
    for (const row of attendance.filter((record) => record.attendanceDate === date && record.activity !== "Holiday")) {
      const key = row.employeeId == null ? `${row.employeeCode}:${row.employeeName}` : String(row.employeeId);
      seen.set(key, row);
    }
    return { day: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", period === "week" ? { weekday: "short" } : { month: "short", day: "numeric" }), value: [...seen.values()].filter((row) => activityStatus(row.activity) !== "Absent").length };
  });

  const departmentCounts = new Map<string, { present: number; total: number }>();
  for (const row of todayAttendance) {
    const bucket = departmentCounts.get(row.department) ?? { present: 0, total: 0 };
    bucket.total++;
    if (["Present", "Late"].includes(activityStatus(row.activity))) bucket.present++;
    departmentCounts.set(row.department, bucket);
  }

  const leaveCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const leave of leaves) {
    const status = leave.status.toLowerCase();
    if (status.includes("pending")) leaveCounts.pending++;
    else if (status.includes("approv")) leaveCounts.approved++;
    else if (status.includes("reject")) leaveCounts.rejected++;
  }

  const payrollProcessed = payrollProfiles.filter((profile) => {
    if (typeof profile !== "object" || profile === null) return false;
    const baseSalaries = read(profile as UnknownRecord, "baseSalaries", "BaseSalaries");
    return Array.isArray(baseSalaries) && baseSalaries.length > 0;
  }).length;

  const upcomingHolidays = asItems(holidaysPayload)
    .flatMap((calendar) => {
      const calendarName = text(read(calendar, "calendarHoliday", "CalendarHoliday"));
      const details = read(calendar, "details", "Details");
      if (!Array.isArray(details)) return [];
      return details
        .filter((detail): detail is UnknownRecord => typeof detail === "object" && detail !== null)
        .map((detail) => ({
          id: numberOrNull(read(detail, "id", "Id")) ?? 0,
          name: text(read(detail, "description", "Description")) || calendarName || "Holiday",
          startDate: dateOnly(read(detail, "startDate", "StartDate")),
          endDate: dateOnly(read(detail, "endDate", "EndDate")),
          days: numberOrNull(read(detail, "days", "Days")) ?? 1,
        }));
    })
    .filter((holiday) => holiday.startDate != null && holiday.startDate >= today)
    .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
    .slice(0, 5);

  const overtimeEmployeeIds = new Set(
    attendance
      .filter((row) => row.overtimeMinutes >= 120 && row.employeeId != null)
      .map((row) => row.employeeId as number)
  );
  const missingPunches = todayAttendance.filter((row) =>
    row.activity !== "Absent" && Boolean(row.attendanceTime) !== Boolean(row.attendanceOutTime)
  ).length;

  const absenceDepartments = [...departmentCounts.entries()]
    .map(([name, value]) => ({
      name,
      count: Math.max(0, value.total - value.present),
      value: value.total ? Math.round(((value.total - value.present) / value.total) * 100) : 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, 5);

  return {
    asOf: new Date().toISOString(),
    period,
    attendanceRange: { fromDate, tillDate },
    selectedEntityId: scopedEntityId ?? null,
    entities: asItems(entitiesPayload).map((entity) => ({
      id: numberOrNull(read(entity, "id", "Id")) ?? 0,
      name: text(read(entity, "name", "Name", "stxt", "Stxt", "shortName", "ShortName")) || "Unnamed entity",
    })).filter((entity) => entity.id > 0),
    totalEmployees: responseTotal(employeesPayload, employees.length),
    employees: employeeDirectory,
    attendance: [
      { name: "Present", value: counts.Present, color: "#159C94" },
      { name: "Absent", value: counts.Absent, color: "#EF5C57" },
      { name: "Late", value: counts.Late, color: "#F5A524" },
      { name: "On leave", value: counts["On Leave"], color: "#94A3B8" },
    ],
    trend,
    liveAttendance: todayAttendance.map((row) => ({ ...row, status: activityStatus(row.activity) })),
    attendanceRecords: attendance
      .filter((row) => row.activity !== "Holiday")
      .sort((a, b) => `${b.attendanceDate ?? ""} ${b.attendanceTime ?? ""}`.localeCompare(`${a.attendanceDate ?? ""} ${a.attendanceTime ?? ""}`))
      .map((row) => ({ ...row, status: activityStatus(row.activity) })),
    departments: [...departmentCounts.entries()].map(([name, value]) => ({ name, value: value.total ? Math.round((value.present / value.total) * 100) : 0 })).sort((a, b) => b.value - a.value),
    leaves: { ...leaveCounts, recent: leaves.slice(0, 5) },
    alerts: {
      missingPunches,
      unapprovedLeave: leaveCounts.pending,
      overtimeRisk: overtimeEmployeeIds.size,
    },
    payroll: {
      processed: payrollProcessed,
      pending: Math.max(0, employees.length - payrollProcessed),
      completion: employees.length ? Math.round((payrollProcessed / employees.length) * 100) : 0,
    },
    upcomingHolidays,
    absenceDepartments,
  };
}
