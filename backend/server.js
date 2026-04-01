import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data", "db.json");

const config = {
  port: Number(process.env.PORT || 3001),
  authSecret: process.env.AUTH_SECRET || "smartcare-dev-secret-change-me",
  tokenTtlHours: Number(process.env.TOKEN_TTL_HOURS || 12),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:8080,http://127.0.0.1:8080")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
};

const publicRoutes = new Set([
  "GET /api/health",
  "POST /api/auth/login",
  "POST /api/auth/register",
]);

const loginAttempts = new Map();
let writeQueue = Promise.resolve();

const defaultHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signValue(value) {
  return createHmac("sha256", config.authSecret).update(value).digest("base64url");
}

function createToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + config.tokenTtlHours * 60 * 60 * 1000,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;

  const [encoded, signature] = token.split(".");
  const expected = signValue(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encoded));
  if (!payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

function getCookieValue(header, name) {
  if (!header) return null;
  const match = header.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
  return match ? match[2] : null;
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", config.corsOrigins[0] || "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, { ...defaultHeaders, ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function sendEmpty(res, statusCode = 204, extraHeaders = {}) {
  res.writeHead(statusCode, { ...defaultHeaders, ...extraHeaders });
  res.end();
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function readDb() {
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw);
  ensureDbShape(db);
  return db;
}

async function writeDb(db) {
  writeQueue = writeQueue.then(() =>
    writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8"),
  );
  return writeQueue;
}

function ensureDbShape(db) {
  const defaults = {
    users: [],
    doctors: [],
    doctorAvailability: [],
    queue: [],
    patients: [],
    diagnoses: [],
    reports: [],
    appointments: [],
    invoices: [],
    medicines: [],
    prescriptionTemplates: [],
    prescriptions: [],
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!Array.isArray(db[key])) {
      db[key] = value;
    }
  }
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleString("en-US", { month: "short" });
}

function dayLabel(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleString("en-US", { weekday: "short" });
}

function nextId(prefix, existingIds) {
  let value = existingIds.length + 1;
  let next = `${prefix}${String(value).padStart(3, "0")}`;
  while (existingIds.includes(next)) {
    value += 1;
    next = `${prefix}${String(value).padStart(3, "0")}`;
  }
  return next;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
  };
}

function normalizePatientPayload(body) {
  return {
    name: String(body.name || "").trim(),
    age: Number(body.age || 0),
    gender: body.gender || "Other",
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim(),
    bloodGroup: String(body.bloodGroup || "").trim(),
    status: body.status || "Active",
    lastVisit: body.lastVisit || "",
    registeredOn: body.registeredOn || getTodayDate(),
    address: String(body.address || "").trim(),
    allergies: Array.isArray(body.allergies) ? body.allergies : [],
    conditions: Array.isArray(body.conditions) ? body.conditions : [],
    medications: Array.isArray(body.medications) ? body.medications : [],
    insuranceProvider: String(body.insuranceProvider || "").trim(),
    policyNumber: String(body.policyNumber || "").trim(),
    coverageNotes: String(body.coverageNotes || "").trim(),
    notes: String(body.notes || "").trim(),
    dentalHistory: body.dentalHistory || null,
  };
}

function normalizeAppointmentPayload(body) {
  return {
    patientId: String(body.patientId || "").trim(),
    patientName: String(body.patientName || "").trim(),
    doctorName: String(body.doctorName || "").trim(),
    date: body.date || getTodayDate(),
    time: body.time || "09:00",
    type: body.type || "OPD",
    status: body.status || "Scheduled",
    reason: String(body.reason || "").trim(),
  };
}

function normalizeInvoicePayload(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  const total = body.total ?? items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    patientId: String(body.patientId || "").trim(),
    patientName: String(body.patientName || "").trim(),
    date: body.date || getTodayDate(),
    items,
    total: Number(total),
    status: body.status || "Pending",
  };
}

function normalizePrescriptionPayload(body) {
  return {
    patientId: String(body.patientId || "").trim(),
    patientName: String(body.patientName || "").trim(),
    doctorName: String(body.doctorName || "").trim(),
    date: body.date || getTodayDate(),
    medicines: Array.isArray(body.medicines) ? body.medicines : [],
    notes: String(body.notes || "").trim(),
  };
}

function buildDashboard(db) {
  const today = getTodayDate();
  const dailyAppointments = db.appointments.filter((item) => item.date === today && item.status !== "Cancelled");
  const revenueTrendMap = new Map();
  const patientVisitMap = new Map();
  const departmentMap = new Map();
  const doctorDepartmentMap = new Map(db.doctors.map((doctor) => [doctor.name, doctor.department]));

  for (const invoice of db.invoices) {
    const label = monthLabel(invoice.date);
    revenueTrendMap.set(label, (revenueTrendMap.get(label) || 0) + Number(invoice.total || 0));
  }

  for (const appointment of db.appointments) {
    const day = dayLabel(appointment.date);
    patientVisitMap.set(day, (patientVisitMap.get(day) || 0) + 1);
    const department = doctorDepartmentMap.get(appointment.doctorName) || "General Dentistry";
    departmentMap.set(department, (departmentMap.get(department) || 0) + 1);
  }

  return {
    stats: {
      dailyPatients: dailyAppointments.length,
      revenue: db.invoices.reduce((sum, item) => sum + Number(item.total || 0), 0),
      appointments: db.appointments.filter((item) => item.status !== "Cancelled").length,
      pendingLabs: db.queue.filter((item) => item.status === "Labs").length,
    },
    revenueTrend: Array.from(revenueTrendMap.entries()).map(([month, revenue]) => ({ month, revenue })),
    patientVisits: Array.from(patientVisitMap.entries()).map(([day, visits]) => ({ day, visits })),
    departmentBreakdown: Array.from(departmentMap.entries()).map(([name, value], index) => ({
      name,
      value,
      fill: ["hsl(219, 85%, 40%)", "hsl(0, 72%, 51%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(199, 89%, 48%)"][index % 5],
    })),
    appointmentsToday: dailyAppointments.sort((left, right) => left.time.localeCompare(right.time)),
  };
}

function routeKey(method, pathname) {
  return `${method} ${pathname}`;
}

function getAuthToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return getCookieValue(req.headers.cookie, "AuthToken");
}

function checkLoginRateLimit(ip) {
  const existing = loginAttempts.get(ip) || { count: 0, resetAt: Date.now() + 10 * 60 * 1000 };
  if (Date.now() > existing.resetAt) {
    existing.count = 0;
    existing.resetAt = Date.now() + 10 * 60 * 1000;
  }

  if (existing.count >= 100) {
    const error = new Error("Too many login attempts. Try again later.");
    error.statusCode = 429;
    throw error;
  }

  existing.count += 1;
  loginAttempts.set(ip, existing);
}

function clearLoginRateLimit(ip) {
  loginAttempts.delete(ip);
}

createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return sendEmpty(res);
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    const key = routeKey(req.method, pathname);

    if (!publicRoutes.has(key) && pathname.startsWith("/api/")) {
      const session = verifyToken(getAuthToken(req));
      if (!session) {
        return sendJson(res, 401, { message: "Unauthorized" });
      }
      req.auth = session;
    }

    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "smartdental-api",
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const ip = req.socket.remoteAddress || "unknown";
      checkLoginRateLimit(ip);

      const db = await readDb();
      const body = await parseBody(req);
      requireFields(body, ["email", "password", "role"]);

      const email = String(body.email).trim().toLowerCase();
      const password = String(body.password);
      const role = String(body.role);

      const user = db.users.find(
        (item) =>
          item.email.toLowerCase() === email &&
          item.role === role,
      );

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return sendJson(res, 401, { message: "Invalid credentials" });
      }

      clearLoginRateLimit(ip);
      const token = createToken(user);
      const cookieHeader = `AuthToken=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${config.tokenTtlHours * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      
      return sendJson(res, 200, {
        token,
        user: sanitizeUser(user),
      }, { "Set-Cookie": cookieHeader });
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
      const db = await readDb();
      const body = await parseBody(req);
      requireFields(body, ["name", "email", "password", "role"]);

      const normalizedEmail = String(body.email).trim().toLowerCase();
      if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
        return sendJson(res, 400, { message: "Email already registered" });
      }

      const user = {
        id: nextId("U", db.users.map(u => u.id)),
        name: String(body.name).trim(),
        email: normalizedEmail,
        password: bcrypt.hashSync(String(body.password), 10),
        role: String(body.role),
        avatar: "",
      };

      db.users.push(user);
      await writeDb(db);

      const token = createToken(user);
      const cookieHeader = `AuthToken=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${config.tokenTtlHours * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

      return sendJson(res, 201, {
        token,
        user: sanitizeUser(user),
      }, { "Set-Cookie": cookieHeader });
    }

    if (req.method === "GET" && pathname === "/api/auth/me") {
      const db = await readDb();
      const user = db.users.find((item) => item.id === req.auth.sub);
      if (!user) {
        return sendJson(res, 404, { message: "User not found" });
      }
      return sendJson(res, 200, { user: sanitizeUser(user) });
    }

    if (req.method === "GET" && pathname === "/api/bootstrap") {
      const db = await readDb();
      return sendJson(res, 200, {
        doctors: db.doctors,
        doctorAvailability: db.doctorAvailability,
        queue: db.queue,
        medicines: db.medicines,
        prescriptionTemplates: db.prescriptionTemplates,
      });
    }

    if (req.method === "GET" && pathname === "/api/dashboard") {
      const db = await readDb();
      return sendJson(res, 200, buildDashboard(db));
    }

    if (req.method === "GET" && pathname === "/api/patients") {
      const db = await readDb();
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const status = url.searchParams.get("status") || "all";
      const gender = url.searchParams.get("gender") || "all";
      const from = url.searchParams.get("from") || "";
      const to = url.searchParams.get("to") || "";

      const items = db.patients.filter((patient) => {
        const matchSearch =
          !search ||
          patient.name.toLowerCase().includes(search) ||
          patient.id.toLowerCase().includes(search);
        const matchStatus = status === "all" || patient.status === status;
        const matchGender = gender === "all" || patient.gender === gender;
        const matchFrom = !from || patient.registeredOn >= from;
        const matchTo = !to || patient.registeredOn <= to;
        return matchSearch && matchStatus && matchGender && matchFrom && matchTo;
      });

      return sendJson(res, 200, items);
    }

    if (req.method === "GET" && pathname.startsWith("/api/patients/")) {
      const db = await readDb();
      const id = pathname.split("/").pop();
      const patient = db.patients.find((item) => item.id === id);

      if (!patient) {
        return sendJson(res, 404, { message: "Patient not found" });
      }

      return sendJson(res, 200, {
        patient,
        diagnoses: db.diagnoses.filter((item) => item.patientId === id),
        reports: db.reports.filter((item) => item.patientId === id),
      });
    }

    if (req.method === "POST" && pathname === "/api/patients") {
      const db = await readDb();
      const body = await parseBody(req);
      requireFields(body, ["name", "phone", "gender", "bloodGroup"]);

      const patient = {
        id: nextId("P", db.patients.map((item) => item.id)),
        ...normalizePatientPayload(body),
      };

      db.patients.unshift(patient);
      await writeDb(db);
      return sendJson(res, 201, patient);
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/patients/")) {
      const db = await readDb();
      const id = pathname.split("/").pop();
      const index = db.patients.findIndex((item) => item.id === id);

      if (index === -1) {
        return sendJson(res, 404, { message: "Patient not found" });
      }

      const body = await parseBody(req);
      db.patients[index] = {
        ...db.patients[index],
        ...body,
      };

      await writeDb(db);
      return sendJson(res, 200, db.patients[index]);
    }

    if (req.method === "GET" && pathname === "/api/appointments") {
      const db = await readDb();
      const date = url.searchParams.get("date");
      const type = url.searchParams.get("type");

      const items = db.appointments
        .filter((item) => !date || item.date === date)
        .filter((item) => !type || type === "all" || item.type === type)
        .sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`));

      return sendJson(res, 200, items);
    }

    if (req.method === "POST" && pathname === "/api/appointments") {
      const db = await readDb();
      const body = await parseBody(req);
      requireFields(body, ["patientId", "patientName", "doctorName", "date", "time", "type"]);

      const appointment = {
        id: nextId("A", db.appointments.map((item) => item.id)),
        ...normalizeAppointmentPayload(body),
      };

      db.appointments.push(appointment);
      await writeDb(db);
      return sendJson(res, 201, appointment);
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/appointments/")) {
      const db = await readDb();
      const id = pathname.split("/").pop();
      const index = db.appointments.findIndex((item) => item.id === id);

      if (index === -1) {
        return sendJson(res, 404, { message: "Appointment not found" });
      }

      const body = await parseBody(req);
      db.appointments[index] = {
        ...db.appointments[index],
        ...body,
      };

      await writeDb(db);
      return sendJson(res, 200, db.appointments[index]);
    }

    if (req.method === "GET" && pathname === "/api/invoices") {
      const db = await readDb();
      return sendJson(res, 200, db.invoices.sort((left, right) => right.date.localeCompare(left.date)));
    }

    if (req.method === "POST" && pathname === "/api/invoices") {
      const db = await readDb();
      const body = await parseBody(req);
      requireFields(body, ["patientId", "patientName", "items"]);

      const invoice = {
        id: nextId("INV", db.invoices.map((item) => item.id)),
        ...normalizeInvoicePayload(body),
      };

      db.invoices.unshift(invoice);
      await writeDb(db);
      return sendJson(res, 201, invoice);
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/invoices/")) {
      const db = await readDb();
      const id = pathname.split("/").pop();
      const index = db.invoices.findIndex((item) => item.id === id);

      if (index === -1) {
        return sendJson(res, 404, { message: "Invoice not found" });
      }

      const body = await parseBody(req);
      db.invoices[index] = {
        ...db.invoices[index],
        ...body,
      };

      await writeDb(db);
      return sendJson(res, 200, db.invoices[index]);
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/invoices/")) {
      const db = await readDb();
      const id = pathname.split("/").pop();
      const index = db.invoices.findIndex((item) => item.id === id);

      if (index === -1) {
        return sendJson(res, 404, { message: "Invoice not found" });
      }

      db.invoices.splice(index, 1);
      await writeDb(db);
      return sendEmpty(res);
    }

    if (req.method === "GET" && pathname === "/api/prescriptions") {
      const db = await readDb();
      const patientId = url.searchParams.get("patientId");
      const items = patientId
        ? db.prescriptions.filter((item) => item.patientId === patientId)
        : db.prescriptions;
      return sendJson(res, 200, items);
    }

    if (req.method === "POST" && pathname === "/api/prescriptions") {
      const db = await readDb();
      const body = await parseBody(req);
      requireFields(body, ["patientId", "patientName", "doctorName", "medicines"]);

      const prescription = {
        id: nextId("RX", db.prescriptions.map((item) => item.id)),
        ...normalizePrescriptionPayload(body),
      };

      db.prescriptions.unshift(prescription);
      await writeDb(db);
      return sendJson(res, 201, prescription);
    }

    return sendJson(res, 404, { message: "Route not found" });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return sendJson(res, statusCode, {
      message: statusCode === 500 ? "Internal server error" : error.message,
    });
  }
}).listen(config.port, () => {
  console.log(`SmartDental API running on http://localhost:${config.port}`);
});
