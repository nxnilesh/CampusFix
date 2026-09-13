/* =========================================================================
   CAMPUSFIX — Smart Campus Issue Reporting System
   Frontend-only academic prototype. HTML + CSS + vanilla JS.
   Data persistence: LocalStorage. Session: LocalStorage (campusfix_session).
   =========================================================================
   SECTIONS
   1.  Configuration / constants
   2.  Storage utilities
   3.  Password hashing
   4.  Authentication
   5.  Session management
   6.  User management
   7.  Role authorization
   8.  Issue management
   9.  Validation
   10. Text moderation
   11. Image processing
   12. Student UI (view renderers)
   13. Resolver UI (view renderers)
   14. Search / filter
   15. Notifications
   16. Dashboard analytics
   17. Theme / settings
   18. Modals
   19. Toasts
   20. Demo data
   21. Navigation / routing
   22. Application initialization
   ========================================================================= */

/* =========================================================================
   1. CONFIGURATION / CONSTANTS
   ========================================================================= */
const CONFIG = {
  KEYS: {
    USERS: "campusfix_users",
    ISSUES: "campusfix_issues",
    NOTIFICATIONS: "campusfix_notifications",
    SETTINGS: "campusfix_settings",
    SESSION: "campusfix_session",
    ID_SEQ: "campusfix_id_seq"
  },
  CATEGORIES: [
    "Electrical", "Furniture", "AC & Cooling", "Plumbing", "Cleanliness",
    "Wi-Fi / Network", "Laboratory", "Safety", "Infrastructure", "Other"
  ],
  LOCATIONS: [
    "Academic Block", "CSE Block", "Computer Lab", "Library", "Seminar Hall",
    "Canteen", "Washroom", "Parking Area", "Classroom", "Corridor", "Other"
  ],
  PRIORITIES: [
    { value: "Low", desc: "Minor inconvenience." },
    { value: "Medium", desc: "Affects normal use of an area." },
    { value: "High", desc: "Safety concern or major disruption." }
  ],
  STATUSES: ["Reported", "Under Review", "In Progress", "Resolved"],
  STATUS_ORDER: { "Reported": 0, "Under Review": 1, "In Progress": 2, "Resolved": 3 },
  MAX_IMAGE_MB: 5,
  MAX_IMAGE_DIM: 1280,
  ACCEPTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  TITLE_MIN: 5, TITLE_MAX: 100,
  DESC_MIN: 10, DESC_MAX: 500,
  ISSUE_YEAR: new Date().getFullYear(),
  PROHIBITED_TERMS: [
    "fuck", "shit", "bitch", "asshole", "bastard", "dumbass", "slut", "whore",
    "rape", "kill yourself", "kys", "nigger", "faggot", "retard", "cunt",
    "sex", "porn", "nude", "suicide bomb", "terrorist attack"
  ]
};

/* Global mutable app state (not persisted — derived each render) */
const APP = {
  route: "landing",
  routeParams: {},
  photoDraft: null,       // { dataUrl, blob, sizeKB, width, height }
  currentIssueFilters: {}
};

/* =========================================================================
   2. STORAGE UTILITIES
   ========================================================================= */
let STORAGE_AVAILABLE = true;

function checkStorageAvailable() {
  try {
    const testKey = "__campusfix_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === "") return fallback;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      // Corrupted LocalStorage must never blank the app: drop the bad key, use fallback.
      console.error("[CampusFix] Corrupted LocalStorage for key:", key, parseErr);
      try { localStorage.removeItem(key); } catch (cleanupErr) { /* keep running */ }
      return fallback;
    }
    if (parsed === null || parsed === undefined) return fallback;
    // Shape guard: never let a stray primitive flow into callers expecting arrays/objects.
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (typeof fallback === "object" && fallback !== null && !Array.isArray(fallback) &&
        (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))) return fallback;
    return parsed;
  } catch (e) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn("safeSet failed for", key, e);
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

function sessionSafeGet(key, fallback) {
  // FIX: session bridges old demo sessions (sessionStorage) and the current
  // LocalStorage session. The login writer saves campusfix_session in LocalStorage,
  // so refresh must also read LocalStorage — otherwise refresh logs the user out.
  try {
    let raw = null;
    try { raw = sessionStorage.getItem(key); } catch (sessErr) { raw = null; }
    if ((raw === null || raw === undefined || raw === "") && key === CONFIG.KEYS.SESSION) {
      try { raw = localStorage.getItem(key); } catch (lsErr) { raw = null; }
    }
    if (raw === null || raw === undefined || raw === "") return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function sessionSafeSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function sessionSafeRemove(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

/* =========================================================================
   3. PASSWORD HASHING (Web Crypto API — SHA-256)
   ========================================================================= */
async function hashPassword(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* =========================================================================
   4. AUTHENTICATION
   ========================================================================= */
function getUsers() {
  return safeGet(CONFIG.KEYS.USERS, []);
}

function saveUsers(users) {
  return safeSet(CONFIG.KEYS.USERS, users);
}

function findUserByUserId(userId) {
  return getUsers().find((u) => u.userId.toLowerCase() === String(userId).toLowerCase());
}

function isUserIdTaken(userId) {
  return !!findUserByUserId(userId);
}

function generateSuggestedId(role) {
  const users = getUsers();
  const prefix = role === "student" ? "STU" : "RES";
  const base = role === "student" ? 1001 : 1001;
  const existingNums = users
    .filter((u) => u.role === role)
    .map((u) => {
      const m = u.userId.match(/^[A-Z]+(\d+)$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((n) => n !== null);
  let next = existingNums.length ? Math.max(...existingNums) + 1 : base;
  let candidate = `${prefix}${next}`;
  while (isUserIdTaken(candidate)) {
    next += 1;
    candidate = `${prefix}${next}`;
  }
  return candidate;
}

async function createUser({ name, userId, password, role, department, year }) {
  if (isUserIdTaken(userId)) {
    return { ok: false, error: "This ID is already in use. Please choose another." };
  }
  const passwordHash = await hashPassword(password);
  const user = {
    id: "u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    userId: userId.trim(),
    department: department || null,
    year: year || null,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };
  const users = getUsers();
  users.push(user);
  const saved = saveUsers(users);
  if (!saved) {
    return { ok: false, error: "Could not save your account. Local storage may be full." };
  }
  return { ok: true, user };
}

async function loginUser({ userId, password, role }) {
  const user = findUserByUserId(userId);
  // Do not reveal whether ID or password specifically was wrong.
  const genericError = "Incorrect User ID or password.";
  if (!user) return { ok: false, error: genericError };
  const enteredHash = await hashPassword(password);
  if (enteredHash !== user.passwordHash) return { ok: false, error: genericError };
  if (user.role !== role) {
    return { ok: false, error: "This account does not have permission to access this portal." };
  }
  createSession(user);
  return { ok: true, user };
}

function logoutUser() {
  sessionSafeRemove(CONFIG.KEYS.SESSION);
  APP.route = "landing";
  showToast("Logged out successfully.", "info");
  navigate("landing");
}

/* =========================================================================
   5. SESSION MANAGEMENT
   ========================================================================= */
function createSession(user) {
  const session = {
    userId: user.userId,
    role: user.role,
    name: user.name,
    loginTime: new Date().toISOString()
  };
  sessionSafeSet(CONFIG.KEYS.SESSION, session);
  return session;
}

function getCurrentSession() {
  return sessionSafeGet(CONFIG.KEYS.SESSION, null);
}

function requireAuth() {
  // FIX: never recurse into navigate() (navigate calls requireAuth via render()).
  // Return null and let render() show landing on the next direct call.
  const session = getCurrentSession();
  if (!session) return null;
  return session;
}

function requireRole(role) {
  const session = requireAuth();
  if (!session) return null;
  // Admin/demo-admin keeps full resolver access; unknown/missing roles fall
  // back to the student's home instead of a blank view.
  if (role === "resolver" && (session.role === "resolver" || session.role === "admin")) return session;
  if (session.role !== role) {
    showToast("Permission denied.", "error");
    return null;
  }
  return session;
}

function getCurrentUserRecord() {
  const session = getCurrentSession();
  if (!session) return null;
  return findUserByUserId(session.userId);
}

/* =========================================================================
   6. USER MANAGEMENT
   ========================================================================= */
function updateUserRecord(userId, patch) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.userId === userId);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...patch };
  return saveUsers(users);
}

async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = findUserByUserId(userId);
  if (!user) return { ok: false, error: "Account not found." };
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.passwordHash) {
    return { ok: false, error: "Current password is incorrect." };
  }
  const newHash = await hashPassword(newPassword);
  const saved = updateUserRecord(userId, { passwordHash: newHash });
  if (!saved) return { ok: false, error: "Could not update password." };
  return { ok: true };
}

/* =========================================================================
   7. ROLE AUTHORIZATION
   (requireAuth / requireRole defined above in section 5; helper below)
   ========================================================================= */
function isResolver() {
  const s = getCurrentSession();
  return !!s && s.role === "resolver";
}
function isStudent() {
  const s = getCurrentSession();
  return !!s && s.role === "student";
}

/* =========================================================================
   8. ISSUE MANAGEMENT
   ========================================================================= */
function getIssues() {
  return safeGet(CONFIG.KEYS.ISSUES, []);
}

function saveIssues(issues) {
  return safeSet(CONFIG.KEYS.ISSUES, issues);
}

function findIssueById(issueId) {
  return getIssues().find((i) => i.id === issueId) || null;
}

function generateIssueId() {
  const issues = getIssues();
  const year = CONFIG.ISSUE_YEAR;
  const nums = issues
    .map((i) => {
      const m = i.id.match(new RegExp(`^CF-${year}-(\\d{4,})$`));
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((n) => n !== null);
  let next = nums.length ? Math.max(...nums) + 1 : 1001;
  let candidate = `CF-${year}-${String(next).padStart(4, "0")}`;
  while (findIssueById(candidate)) {
    next += 1;
    candidate = `CF-${year}-${String(next).padStart(4, "0")}`;
  }
  return candidate;
}

function createIssue(data) {
  const issues = getIssues();
  const now = new Date().toISOString();
  const issue = {
    id: generateIssueId(),
    studentId: data.studentId,
    studentName: data.studentName,
    title: data.title.trim(),
    category: data.category,
    location: data.location,
    room: data.room ? data.room.trim() : "",
    priority: data.priority,
    description: data.description.trim(),
    image: data.image || null,
    status: "Reported",
    createdAt: now,
    updatedAt: now,
    resolverId: null,
    resolverName: null,
    resolutionNote: "",
    isDemo: !!data.isDemo
  };
  issues.push(issue);
  const saved = saveIssues(issues);
  if (!saved) return { ok: false, error: "Could not save your report. Local storage may be full." };
  return { ok: true, issue };
}

function updateIssue(issueId, patch) {
  const issues = getIssues();
  const idx = issues.findIndex((i) => i.id === issueId);
  if (idx === -1) return { ok: false, error: "Issue not found." };
  issues[idx] = { ...issues[idx], ...patch, updatedAt: new Date().toISOString() };
  const saved = saveIssues(issues);
  if (!saved) return { ok: false, error: "Could not save the update." };
  return { ok: true, issue: issues[idx] };
}

function deleteIssue(issueId) {
  const issues = getIssues();
  const filtered = issues.filter((i) => i.id !== issueId);
  return saveIssues(filtered);
}

function getIssuesForStudent(studentUserId) {
  return getIssues().filter((i) => i.studentId === studentUserId);
}

/* =========================================================================
   9. VALIDATION
   ========================================================================= */
function validateStudentId(id) {
  if (!id || id.length < 4 || id.length > 20) {
    return "Student ID must be 4–20 characters.";
  }
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    return "Student ID may only contain letters and numbers, no spaces.";
  }
  if (isUserIdTaken(id)) {
    return "This ID is already in use. Please choose another.";
  }
  return null;
}

function validateResolverId(id) {
  if (!id || id.length < 4 || id.length > 20) {
    return "Resolver ID must be 4–20 characters.";
  }
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    return "Resolver ID may only contain letters and numbers, no spaces.";
  }
  if (isUserIdTaken(id)) {
    return "This ID is already in use. Please choose another.";
  }
  return null;
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 8) score++;
  if (score <= 2) return { level: "weak", label: "Weak", pct: 33 };
  if (score <= 4) return { level: "medium", label: "Medium", pct: 66 };
  return { level: "strong", label: "Strong", pct: 100 };
}

function validatePassword(pw) {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  return null;
}

function validateIssueTitle(title) {
  if (!title || title.trim().length < CONFIG.TITLE_MIN) return `Title must be at least ${CONFIG.TITLE_MIN} characters.`;
  if (title.trim().length > CONFIG.TITLE_MAX) return `Title must be under ${CONFIG.TITLE_MAX} characters.`;
  return null;
}

function validateIssueDescription(desc) {
  if (!desc || desc.trim().length < CONFIG.DESC_MIN) return `Description must be at least ${CONFIG.DESC_MIN} characters.`;
  if (desc.trim().length > CONFIG.DESC_MAX) return `Description must be under ${CONFIG.DESC_MAX} characters.`;
  return null;
}

/* =========================================================================
   10. TEXT MODERATION
   ========================================================================= */
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[5$]/g, "s")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsProhibitedLanguage(text) {
  const normalized = normalizeText(text);
  return CONFIG.PROHIBITED_TERMS.some((term) => normalized.includes(term));
}

function isSpammyText(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return false;
  // Extremely repetitive single character, e.g. "aaaaaaaaaaaaaaa"
  if (/(.)\1{9,}/.test(trimmed)) return true;
  // Massive repeated word
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length >= 6) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.25) return true;
  }
  // Meaningless repeated symbols
  if (/([^\w\s])\1{6,}/.test(trimmed)) return true;
  return false;
}

function moderateText(text) {
  if (!text) return { ok: true };
  if (containsProhibitedLanguage(text) || isSpammyText(text)) {
    return { ok: false, error: "Please rewrite your report using professional and respectful language." };
  }
  return { ok: true };
}

/* =========================================================================
   11. IMAGE PROCESSING
   ========================================================================= */
function validateImageFile(file) {
  if (!file) return "No file selected.";
  const acceptedExtensions = ["jpg", "jpeg", "png", "webp"];
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!CONFIG.ACCEPTED_IMAGE_TYPES.includes(file.type) || !acceptedExtensions.includes(ext)) {
    return "Please choose a valid JPG, PNG or WEBP image.";
  }
  const maxBytes = CONFIG.MAX_IMAGE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `Image must be smaller than ${CONFIG.MAX_IMAGE_MB} MB.`;
  }
  return null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This file could not be processed as an image."));
    img.src = dataUrl;
  });
}

function compressImage(img) {
  const maxDim = CONFIG.MAX_IMAGE_DIM;
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  // Prefer JPEG for compatibility/size; quality 0.8
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { dataUrl, width, height };
}

async function processIssuePhoto(file) {
  const fileError = validateImageFile(file);
  if (fileError) return { ok: false, error: fileError };
  try {
    const rawDataUrl = await readFileAsDataUrl(file);
    const img = await loadImageElement(rawDataUrl);
    const { dataUrl, width, height } = compressImage(img);
    const sizeKB = Math.round((dataUrl.length * 0.75) / 1024);
    return { ok: true, dataUrl, width, height, sizeKB };
  } catch (e) {
    return { ok: false, error: "This image could not be processed. Please try another file." };
  }
}

/* =========================================================================
   15. NOTIFICATIONS  (placed here so issue/session helpers above are ready)
   ========================================================================= */
function getNotifications() {
  return safeGet(CONFIG.KEYS.NOTIFICATIONS, []);
}
function saveNotifications(list) {
  return safeSet(CONFIG.KEYS.NOTIFICATIONS, list);
}
function addNotification(userId, message, type) {
  const list = getNotifications();
  list.unshift({
    id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    userId,
    message,
    type: type || "info",
    createdAt: new Date().toISOString(),
    read: false
  });
  saveNotifications(list);
}
function getNotificationsForCurrentUser() {
  const session = getCurrentSession();
  if (!session) return [];
  return getNotifications().filter((n) => n.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function unreadNotificationCount() {
  return getNotificationsForCurrentUser().filter((n) => !n.read).length;
}
function markNotificationRead(notifId) {
  const list = getNotifications();
  const idx = list.findIndex((n) => n.id === notifId);
  if (idx !== -1) { list[idx].read = true; saveNotifications(list); }
}
function markAllNotificationsRead() {
  const session = getCurrentSession();
  if (!session) return;
  const list = getNotifications().map((n) => (n.userId === session.userId ? { ...n, read: true } : n));
  saveNotifications(list);
}
function notifyAllResolvers(message, type) {
  const resolvers = getUsers().filter((u) => u.role === "resolver");
  resolvers.forEach((r) => addNotification(r.userId, message, type));
}

/* =========================================================================
   Shared formatting helpers
   ========================================================================= */
function normalizeStatus(value) {
  // FIX: single source of truth for status labels. Legacy demo data uses
  // "Acknowledged"/"Closed"/"pending"/"under_review" — map them to the 4
  // canonical statuses so badges, filters, track view and counts stay consistent.
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const lower = raw.toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  const map = {
    "reported": "Reported",
    "report": "Reported",
    "pending": "Reported",
    "new": "Reported",
    "acknowledged": "Under Review",
    "acknowledge": "Under Review",
    "under review": "Under Review",
    "review": "Under Review",
    "reviewing": "Under Review",
    "in progress": "In Progress",
    "inprogress": "In Progress",
    "progress": "In Progress",
    "working": "In Progress",
    "resolved": "Resolved",
    "resolve": "Resolved",
    "closed": "Resolved",
    "done": "Resolved",
    "complete": "Resolved",
    "completed": "Resolved",
    "rejected": "Resolved"
  };
  if (map[lower]) return map[lower];
  const titled = lower.replace(/\b\w/g, (c) => c.toUpperCase());
  return CONFIG.STATUSES.includes(titled) ? titled : raw;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0][0] : "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
}

function relativeTime(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

function statusBadgeClass(status) {
  return "badge-" + status.toLowerCase().replace(/\s+/g, "-");
}
function priorityBadgeClass(priority) {
  return "badge-priority-" + priority.toLowerCase();
}

function badgeHtml(text, cls) {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

/* =========================================================================
   19. TOASTS
   ========================================================================= */
function ensureToastContainer() {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("role", "status");
    document.body.appendChild(container);
  }
  return container;
}

const TOAST_ICONS = { success: "✓", error: "✕", warning: "!", info: "i" };

function showToast(message, type) {
  type = type || "info";
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || "i"}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 220ms ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 240);
  }, 3400);
}

/* =========================================================================
   18. MODALS
   ========================================================================= */
function ensureModalRoot() {
  let root = document.getElementById("modalRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "modalRoot";
    document.body.appendChild(root);
  }
  return root;
}

let lastFocusedBeforeModal = null;

function openModal({ title, bodyHtml, footerHtml, wide, onOpen, closable }) {
  closable = closable !== false;
  const root = ensureModalRoot();
  lastFocusedBeforeModal = document.activeElement;
  root.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-box ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title || "Dialog")}">
        <div class="modal-header">
          <h2>${escapeHtml(title || "")}</h2>
          ${closable ? `<button class="modal-close" data-action="closeModal" aria-label="Close dialog">✕</button>` : ""}
        </div>
        <div class="modal-body">${bodyHtml || ""}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
      </div>
    </div>
  `;
  const overlay = document.getElementById("modalOverlay");
  if (closable) {
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  document.addEventListener("keydown", modalEscHandler);
  const firstFocusable = overlay.querySelector("button, input, select, textarea, a[href]");
  if (firstFocusable) firstFocusable.focus();
  if (onOpen) onOpen();
}

function modalEscHandler(e) {
  if (e.key === "Escape") closeModal();
}

function closeModal() {
  const root = document.getElementById("modalRoot");
  if (root) root.innerHTML = "";
  document.removeEventListener("keydown", modalEscHandler);
  if (lastFocusedBeforeModal && lastFocusedBeforeModal.focus) {
    try { lastFocusedBeforeModal.focus(); } catch (e) { /* noop */ }
  }
}

/* =========================================================================
   21. NAVIGATION / ROUTING
   ========================================================================= */
const APP_ROOT_ID = "app";

function navigate(route, params) {
  APP.route = route;
  APP.routeParams = params || {};
  APP.photoDraft = null;
  closeModal();
  render();
  window.scrollTo(0, 0);
  closeSidebarMobile();
}

function getAppRoot() {
  return document.getElementById(APP_ROOT_ID);
}

function render() {
  // FIX: every code path below must paint *something*. The old code could
  // return early with stale/empty #app (blank screen) when guards failed.
  const root = getAppRoot();
  if (!root) return;
  try {
    if (!STORAGE_AVAILABLE) {
      root.innerHTML = renderFatalStorageBanner();
      return;
    }
    const route = APP.route;
    const publicRoutes = ["landing", "studentSignup", "resolverSignup", "studentLogin", "resolverLogin", "signupSuccess", "aboutPublic", "securityPublic"];

    if (publicRoutes.includes(route)) {
      root.innerHTML = renderPublicRoute(route);
      bindPublicRoute(route);
      return;
    }

    // Protected routes
    const session = requireAuth();
    if (!session) {
      // No session (e.g. after corrupted storage): never leave a blank shell.
      APP.route = "landing"; APP.routeParams = {};
      root.innerHTML = renderPublicRoute("landing");
      bindPublicRoute("landing");
      return;
    }

    const studentRoutes = ["studentDashboard", "reportIssue", "myIssues", "issueDetails", "trackIssue"];
    const resolverRoutes = ["resolverDashboard", "allIssues", "resolverIssueDetails", "campusOverview"];

    if (studentRoutes.includes(route) && session.role !== "student") {
      // Student view requested by resolver/admin (or unknown role): role home, not blank.
      showToast("Permission denied.", "error");
      const home = (session.role === "resolver" || session.role === "admin") ? "resolverDashboard" : "studentDashboard";
      APP.route = home; APP.routeParams = {};
      root.innerHTML = renderShell(home, home === "resolverDashboard" ? renderResolverDashboard() : renderStudentDashboard());
      bindShellChrome();
      bindRouteView(home);
      applyCompactMode();
      return;
    }
    if (resolverRoutes.includes(route) && !(session.role === "resolver" || session.role === "admin")) {
      // Student hitting the Resolver Portal gets a proper access-denied state
      // with a way back — never a blank page.
      APP.route = "studentDashboard"; APP.routeParams = {};
      root.innerHTML = renderShell("studentDashboard", renderAccessDenied("resolver"));
      bindShellChrome();
      bindRouteView("studentDashboard");
      applyCompactMode();
      return;
    }

    let inner = "";
    switch (route) {
      case "studentDashboard": inner = renderStudentDashboard(); break;
      case "reportIssue": inner = renderReportIssue(); break;
      case "myIssues": inner = renderMyIssues(); break;
      case "issueDetails": inner = renderStudentIssueDetails(APP.routeParams.issueId); break;
      case "trackIssue": inner = renderTrackIssue(); break;
      case "resolverDashboard": inner = renderResolverDashboard(); break;
      case "allIssues": inner = renderAllIssues(); break;
      case "resolverIssueDetails": inner = renderResolverIssueDetails(APP.routeParams.issueId); break;
      case "campusOverview": inner = renderCampusOverview(); break;
      case "profile": inner = renderProfile(); break;
      case "settings": inner = renderSettings(); break;
      case "about": inner = renderStaticContent("about"); break;
      case "security": inner = renderStaticContent("security"); break;
      default:
        // Unknown route: fall back to the role home, never a blank page.
        APP.route = (session.role === "resolver" || session.role === "admin") ? "resolverDashboard" : "studentDashboard";
        APP.routeParams = {};
        inner = APP.route === "resolverDashboard" ? renderResolverDashboard() : renderStudentDashboard();
    }

    // Defensive: a renderer must never resolve to empty markup for a valid route.
    if (!inner) {
      const home = (session.role === "resolver" || session.role === "admin") ? "resolverDashboard" : "studentDashboard";
      APP.route = home; APP.routeParams = {};
      inner = home === "resolverDashboard" ? renderResolverDashboard() : renderStudentDashboard();
    }

    root.innerHTML = renderShell(APP.route, inner);
    bindShellChrome();
    bindRouteView(APP.route);
    applyCompactMode();
  } catch (renderErr) {
    // Last-resort friendly state: log for debugging, keep the app interactive.
    console.error("[CampusFix] Render failed:", renderErr);
    try {
      root.innerHTML = `<div class="auth-wrap"><div class="auth-card"><div class="success-screen">
        <div class="success-icon">!</div>
        <h1>Something went wrong.</h1>
        <p class="auth-sub">Please try again. Your saved reports are safe.</p>
        <button class="btn btn-primary" data-action="goto" data-route="landing">Back to Home</button>
      </div></div></div>`;
    } catch (paintErr) { /* keep app from hard-crashing */ }
  }
}

// Access-denied state for Resolver Portal (frontend/demo role-based access).
function renderAccessDenied(area) {
  const label = area === "resolver" ? "Resolver access required." : "Access denied.";
  return `<div class="empty-state">
    <div class="empty-icon">🔒</div>
    <h3>${escapeHtml(label)}</h3>
    <p>This area is limited to resolver / admin accounts in this frontend demo.</p>
    <button class="btn btn-primary" data-action="goto" data-route="studentDashboard">Back to Dashboard</button>
  </div>`;
}

function renderFatalStorageBanner() {
  return `
    <div class="fatal-banner">
      <div class="card">
        <h2>Local browser storage is unavailable</h2>
        <p>CampusFix cannot persist data in this browser. Please disable private/incognito
        restrictions on storage, or try a different browser, then reload this page.</p>
      </div>
    </div>
  `;
}

/* ---- Public route dispatch ---- */
function renderPublicRoute(route) {
  switch (route) {
    case "landing": return renderLanding();
    case "studentSignup": return renderSignupForm("student");
    case "resolverSignup": return renderSignupForm("resolver");
    case "studentLogin": return renderLoginForm("student");
    case "resolverLogin": return renderLoginForm("resolver");
    case "signupSuccess": return renderSignupSuccess();
    case "aboutPublic": return renderPublicStaticWrap("about");
    case "securityPublic": return renderPublicStaticWrap("security");
    default: return renderLanding();
  }
}

function bindPublicRoute(route) {
  if (route === "studentSignup") bindSignupForm("student");
  if (route === "resolverSignup") bindSignupForm("resolver");
  if (route === "studentLogin") bindLoginForm("student");
  if (route === "resolverLogin") bindLoginForm("resolver");
  bindGlobalDataActions();
}

/* =========================================================================
   LANDING PAGE
   ========================================================================= */
function renderLanding() {
  return `
    <div class="landing">
      <div class="landing-brand">
        <div class="brand-mark">CF</div>
        <div>
          <div class="brand-text-name">CampusFix</div>
          <div class="brand-text-sub">Smart Campus Issue Reporting</div>
        </div>
      </div>

      <div class="landing-hero">
        <h1>Help make your campus better.</h1>
        <p>Report problems, track progress and help your college resolve issues faster.</p>
      </div>

      <div class="role-grid">
        <div class="role-card role-card--student">
          <div class="role-icon">🎓</div>
          <h2>Student Portal</h2>
          <p>Report campus problems, attach evidence and track the progress of your reports.</p>
          <div class="role-card-actions">
            <button class="btn btn-primary" data-action="navigate" data-route="studentLogin">Student Login</button>
            <button class="btn btn-secondary" data-action="navigate" data-route="studentSignup">Create Student Account</button>
          </div>
        </div>
        <div class="role-card role-card--resolver">
          <div class="role-icon">🛡️</div>
          <h2>Campus Resolver</h2>
          <p>Review student reports, investigate campus issues and manage resolutions.</p>
          <div class="role-card-actions">
            <button class="btn btn-primary" data-action="navigate" data-route="resolverLogin">Resolver Login</button>
            <button class="btn btn-secondary" data-action="navigate" data-route="resolverSignup">Create Resolver Account</button>
          </div>
        </div>
      </div>

      <div class="landing-footer">
        <div class="footer-links">
          <button class="link-btn" data-action="navigate" data-route="aboutPublic">About CampusFix</button>
          <button class="link-btn" data-action="navigate" data-route="securityPublic">Security &amp; Privacy</button>
        </div>
        <div>CampusFix • Academic Mini Project</div>
        <div>Built with HTML, CSS, JavaScript &amp; LocalStorage</div>
      </div>
    </div>
  `;
}

function renderPublicStaticWrap(kind) {
  return `
    <div class="auth-wrap">
      <div class="auth-card" style="max-width:640px;">
        <button class="btn btn-ghost btn-sm auth-back" data-action="navigate" data-route="landing">&larr; Back to Home</button>
        ${renderStaticContent(kind)}
      </div>
    </div>
  `;
}

/* =========================================================================
   SIGNUP FORMS
   ========================================================================= */
function renderSignupForm(role) {
  const isStudentRole = role === "student";
  const suggestedId = generateSuggestedId(role);
  const heading = isStudentRole ? "Create your Student Account" : "Create Campus Resolver Account";
  const loginRoute = isStudentRole ? "studentLogin" : "resolverLogin";

  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <button class="btn btn-ghost btn-sm auth-back" data-action="navigate" data-route="landing">&larr; Back</button>
        <h1>${heading}</h1>
        ${isStudentRole
          ? `<p class="auth-sub">Set up your account to report and track campus issues.</p>`
          : `<p class="auth-sub">Resolver accounts are intended for authorized college issue-management personnel.</p>
             <div class="notice-box">Demo/academic resolver registration. Production systems should use institution-controlled account verification.</div>`
        }

        <form id="signupForm" novalidate>
          <div class="field" id="field-name">
            <label for="inp-name">Full Name</label>
            <input type="text" id="inp-name" name="name" autocomplete="name" />
            <div class="error-msg"></div>
          </div>

          <div class="field" id="field-userId">
            <label for="inp-userId">${isStudentRole ? "Student User ID" : "Resolver ID"}</label>
            <div class="id-suggest-row">
              <input type="text" id="inp-userId" name="userId" value="${escapeHtml(suggestedId)}" />
              <button type="button" class="btn btn-secondary btn-sm" data-action="regenId" data-role="${role}">Suggest New</button>
            </div>
            <div class="hint">4–20 characters, letters and numbers only. You can use the suggested ID or enter your own.</div>
            <div class="error-msg"></div>
          </div>

          ${isStudentRole ? `
          <div class="form-grid">
            <div class="field" id="field-department">
              <label for="inp-department">Department</label>
              <input type="text" id="inp-department" name="department" placeholder="e.g. CSE" />
              <div class="error-msg"></div>
            </div>
            <div class="field" id="field-year">
              <label for="inp-year">Year</label>
              <select id="inp-year" name="year">
                <option value="">Select year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
              <div class="error-msg"></div>
            </div>
          </div>` : ""}

          <div class="field" id="field-password">
            <label for="inp-password">Password</label>
            <div class="pw-field-wrap">
              <input type="password" id="inp-password" name="password" autocomplete="new-password" />
            </div>
            <div class="strength-meter"><div class="strength-meter-fill" id="strengthFill"></div></div>
            <div class="strength-label" id="strengthLabel">Minimum 8 characters, with uppercase, lowercase and a number.</div>
            <div class="error-msg"></div>
          </div>

          <div class="field" id="field-confirmPassword">
            <label for="inp-confirmPassword">Confirm Password</label>
            <input type="password" id="inp-confirmPassword" name="confirmPassword" autocomplete="new-password" />
            <div class="error-msg"></div>
          </div>

          <div class="pw-toggle-row">
            <input type="checkbox" id="chk-showPw" />
            <label for="chk-showPw">Show Password</label>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="margin-top:18px;">
            ${isStudentRole ? "Create Student Account" : "Create Resolver Account"}
          </button>
        </form>

        <div class="auth-foot">
          Already have an account?
          <button class="link-btn" data-action="navigate" data-route="${loginRoute}">Log in</button>
        </div>
      </div>
    </div>
  `;
}

function bindSignupForm(role) {
  const form = document.getElementById("signupForm");
  if (!form) return;
  const pwInput = document.getElementById("inp-password");
  const showPwChk = document.getElementById("chk-showPw");
  const confirmInput = document.getElementById("inp-confirmPassword");

  pwInput.addEventListener("input", () => {
    const val = pwInput.value;
    const s = passwordStrength(val);
    const fill = document.getElementById("strengthFill");
    const label = document.getElementById("strengthLabel");
    fill.style.width = val ? s.pct + "%" : "0%";
    fill.style.background =
      s.level === "weak" ? "var(--color-danger)" : s.level === "medium" ? "var(--color-warning)" : "var(--color-success)";
    label.textContent = val ? `Password strength: ${s.label}` : "Minimum 8 characters, with uppercase, lowercase and a number.";
  });

  showPwChk.addEventListener("change", () => {
    const type = showPwChk.checked ? "text" : "password";
    pwInput.type = type;
    confirmInput.type = type;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const name = form.name.value.trim();
    const userId = form.userId.value.trim();
    const department = role === "student" ? form.department.value.trim() : null;
    const year = role === "student" ? form.year.value : null;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    let hasError = false;
    if (!name || name.length < 2) { setFieldError("field-name", "Please enter your full name."); hasError = true; }

    const idError = role === "student" ? validateStudentId(userId) : validateResolverId(userId);
    if (idError) { setFieldError("field-userId", idError); hasError = true; }

    if (role === "student") {
      if (!department) { setFieldError("field-department", "Please enter your department."); hasError = true; }
      if (!year) { setFieldError("field-year", "Please select your year."); hasError = true; }
    }

    const pwError = validatePassword(password);
    if (pwError) { setFieldError("field-password", pwError); hasError = true; }

    if (confirmPassword !== password) {
      setFieldError("field-confirmPassword", "Passwords do not match."); hasError = true;
    }

    if (hasError) return;

    const submitBtn = form.querySelector("button[type=submit]");
    if (submitBtn) submitBtn.disabled = true;

    const result = await createUser({ name, userId, password, role, department, year });
    if (submitBtn) submitBtn.disabled = false;

    if (!result.ok) {
      setFieldError("field-userId", result.error);
      showToast(result.error, "error");
      return;
    }

    // FIX (blank screen after registration): create the session FIRST, then
    // navigate directly to the role home. The old flow went to an intermediate
    // signupSuccess view that crashed on missing params, leaving #app blank.
    // Auto-login keeps the flow: validate -> save user -> save session ->
    // role home -> toast, with zero blank states.
    try {
      const autoLogin = await loginUser({ userId: result.user.userId, password, role });
      if (!autoLogin.ok) {
        // User exists but auto-login failed (should be rare): fall back to login screen.
        showToast("Account created successfully. Please sign in.", "success");
        navigate(role === "resolver" ? "resolverLogin" : "studentLogin");
        return;
      }
      showToast("Account created successfully.", "success");
      navigate(role === "resolver" ? "resolverDashboard" : "studentDashboard");
    } catch (loginErr) {
      console.error("[CampusFix] Auto-login after registration failed:", loginErr);
      showToast("Account created successfully. Please sign in.", "success");
      navigate(role === "resolver" ? "resolverLogin" : "studentLogin");
    }
  });
}

/* Suggest-new-ID button handler is wired via global data-action dispatcher (regenId) */

/* =========================================================================
   SIGNUP SUCCESS SCREEN
   ========================================================================= */
function renderSignupSuccess() {
  // Kept for deep-links/bookmarks: the registration flow now auto-logs in and
  // lands on the role dashboard, but this view must never crash on missing params
  // (that crash was one blank-screen path). Every value is guarded.
  const params = APP.routeParams || {};
  const role = params.role === "resolver" ? "resolver" : "student";
  const name = params.name || "New member";
  const userId = params.userId || "";
  const loginRoute = role === "resolver" ? "resolverLogin" : "studentLogin";
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="success-screen">
          <div class="success-icon">✓</div>
          <h1>Account created successfully.</h1>
          <div class="success-detail-box">
            <div><span class="label">Name</span><span class="value">${escapeHtml(name)}</span></div>
            <div><span class="label">${role === "resolver" ? "Resolver ID" : "Student ID"}</span><span class="value">${escapeHtml(userId)}</span></div>
          </div>
          <button class="btn btn-primary btn-block" data-action="navigate" data-route="${loginRoute}">Continue to ${role === "resolver" ? "Resolver" : "Student"} Login</button>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================================
   LOGIN FORMS
   ========================================================================= */
function renderLoginForm(role) {
  const isStudentRole = role === "student";
  const signupRoute = isStudentRole ? "studentSignup" : "resolverSignup";
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <button class="btn btn-ghost btn-sm auth-back" data-action="navigate" data-route="landing">&larr; Back</button>
        <h1>${isStudentRole ? "CampusFix Student Portal" : "CampusFix Resolver Portal"}</h1>
        <p class="auth-sub">${isStudentRole ? "Log in to report and track campus issues." : "Log in to review and resolve campus reports."}</p>

        <form id="loginForm" novalidate>
          <div class="field" id="field-userId">
            <label for="inp-userId">${isStudentRole ? "Student ID" : "Resolver ID"}</label>
            <input type="text" id="inp-userId" name="userId" autocomplete="username" />
            <div class="error-msg"></div>
          </div>
          <div class="field" id="field-password">
            <label for="inp-password">Password</label>
            <input type="password" id="inp-password" name="password" autocomplete="current-password" />
            <div class="error-msg"></div>
          </div>
          <div class="pw-toggle-row">
            <input type="checkbox" id="chk-showPw" />
            <label for="chk-showPw">Show Password</label>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:18px;">Login</button>
        </form>

        <div class="auth-foot">
          New here?
          <button class="link-btn" data-action="navigate" data-route="${signupRoute}">${isStudentRole ? "Create Student Account" : "Create Resolver Account"}</button>
        </div>
      </div>
    </div>
  `;
}

function bindLoginForm(role) {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const pwInput = document.getElementById("inp-password");
  document.getElementById("chk-showPw").addEventListener("change", (e) => {
    pwInput.type = e.target.checked ? "text" : "password";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const userId = form.userId.value.trim();
    const password = form.password.value;
    let hasError = false;
    if (!userId) { setFieldError("field-userId", "Please enter your ID."); hasError = true; }
    if (!password) { setFieldError("field-password", "Please enter your password."); hasError = true; }
    if (hasError) return;

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    const result = await loginUser({ userId, password, role });
    submitBtn.disabled = false;

    if (!result.ok) {
      setFieldError("field-password", result.error);
      showToast(result.error, "error");
      return;
    }

    showToast("Login successful.", "success");
    seedLoginNotificationIfNeeded();
    navigate(role === "student" ? "studentDashboard" : "resolverDashboard");
  });
}

function seedLoginNotificationIfNeeded() {
  // no-op hook reserved for future login-time notices
}

/* =========================================================================
   Field error helpers
   ========================================================================= */
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add("has-error");
  const msg = field.querySelector(".error-msg");
  if (msg) msg.textContent = message;
}
function clearFieldErrors(form) {
  form.querySelectorAll(".field.has-error").forEach((f) => {
    f.classList.remove("has-error");
    const msg = f.querySelector(".error-msg");
    if (msg) msg.textContent = "";
  });
}

/* =========================================================================
   APP SHELL (sidebar + topbar) used by both roles
   ========================================================================= */
const STUDENT_NAV = [
  { route: "studentDashboard", label: "Dashboard", icon: "🏠" },
  { route: "reportIssue", label: "Report Issue", icon: "➕" },
  { route: "myIssues", label: "My Issues", icon: "📋" },
  { route: "trackIssue", label: "Track Issue", icon: "🔍" },
  { route: "profile", label: "Profile", icon: "👤" },
  { route: "settings", label: "Settings", icon: "⚙️" }
];
const RESOLVER_NAV = [
  { route: "resolverDashboard", label: "Dashboard", icon: "🏠" },
  { route: "allIssues", label: "All Issues", icon: "📋" },
  { route: "campusOverview", label: "Campus Overview", icon: "📊" },
  { route: "profile", label: "Profile", icon: "👤" },
  { route: "settings", label: "Settings", icon: "⚙️" }
];

function routeTitle(route) {
  const map = {
    studentDashboard: "Dashboard", reportIssue: "Report an Issue", myIssues: "My Issues",
    issueDetails: "Issue Details", trackIssue: "Track Issue",
    resolverDashboard: "Resolver Dashboard", allIssues: "All Campus Issues",
    resolverIssueDetails: "Issue Workspace", campusOverview: "Campus Overview",
    profile: "Profile", settings: "Settings", about: "About CampusFix", security: "Security & Privacy"
  };
  return map[route] || "CampusFix";
}

function renderShell(activeRoute, innerHtml) {
  const session = getCurrentSession();
  const navItems = session.role === "student" ? STUDENT_NAV : RESOLVER_NAV;
  const unread = unreadNotificationCount();

  const navHtml = navItems.map((item) => `
    <button class="nav-item ${activeRoute === item.route ? "active" : ""}" data-action="navigate" data-route="${item.route}">
      <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
    </button>
  `).join("");

  return `
    <div class="app-shell">
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">CF</div>
          <div>
            <div class="sidebar-brand-text">CampusFix</div>
            <span class="sidebar-role-tag">${session.role === "student" ? "Student" : "Resolver"}</span>
          </div>
        </div>
        <nav class="sidebar-nav" aria-label="Primary">${navHtml}</nav>
        <div class="sidebar-foot">
          <button class="nav-item" data-action="navigate" data-route="about"><span class="nav-icon">ℹ️</span><span>About CampusFix</span></button>
          <button class="nav-item" data-action="navigate" data-route="security"><span class="nav-icon">🔒</span><span>Security &amp; Privacy</span></button>
          <button class="nav-item" data-action="logout"><span class="nav-icon">↩️</span><span>Logout</span></button>
        </div>
      </aside>

      <div class="app-main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="hamburger" id="hamburgerBtn" aria-label="Open menu">☰</button>
            <div class="topbar-title">${routeTitle(activeRoute)}</div>
          </div>
          <div class="topbar-right">
            <button class="icon-btn" id="notifBellBtn" aria-label="Notifications">
              🔔${unread > 0 ? `<span class="notif-dot">${unread > 9 ? "9+" : unread}</span>` : ""}
            </button>
            <div class="avatar-pill" id="avatarPillBtn" data-action="navigate" data-route="profile">
              <div class="avatar-circle">${initials(session.name)}</div>
              <span class="avatar-pill-name">${escapeHtml(session.name)}</span>
            </div>
          </div>
        </header>
        <main class="page-body">${innerHtml}</main>
      </div>
    </div>
  `;
}

function bindShellChrome() {
  const hamburger = document.getElementById("hamburgerBtn");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("open");
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeSidebarMobile);

  const bellBtn = document.getElementById("notifBellBtn");
  if (bellBtn) bellBtn.addEventListener("click", openNotificationPanel);

  bindGlobalDataActions();
}

function closeSidebarMobile() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
}

function applyCompactMode() {
  const settings = getSettingsForCurrentUser();
  document.body.classList.toggle("compact-mode", !!(settings && settings.compactMode));
}

/* =========================================================================
   Notification panel
   ========================================================================= */
function openNotificationPanel() {
  const notifs = getNotificationsForCurrentUser();
  const bodyHtml = notifs.length
    ? notifs.map((n) => `
        <div class="notif-item ${n.read ? "" : "unread"}">
          <div class="notif-dot-small" style="visibility:${n.read ? "hidden" : "visible"}"></div>
          <div>
            <div>${escapeHtml(n.message)}</div>
            <div class="notif-time">${relativeTime(n.createdAt)}</div>
          </div>
        </div>
      `).join("")
    : `<div class="empty-state"><div class="empty-icon">🔔</div><h3>No notifications yet</h3><p>Updates about your issues will appear here.</p></div>`;

  openModal({
    title: "Notifications",
    bodyHtml: `<div class="notif-panel">${bodyHtml}</div>`,
    footerHtml: notifs.length ? `<button class="btn btn-secondary btn-sm" data-action="markAllRead">Mark all as read</button>` : "",
  });
  // modal-body padding conflicts with notif-item full width rows; strip padding for this modal
  const body = document.querySelector(".modal-body");
  if (body) body.style.padding = "0";
}

/* =========================================================================
   17. THEME / SETTINGS
   ========================================================================= */
function getAllSettings() {
  return safeGet(CONFIG.KEYS.SETTINGS, {});
}
function saveAllSettings(all) {
  return safeSet(CONFIG.KEYS.SETTINGS, all);
}
function getSettingsForCurrentUser() {
  const session = getCurrentSession();
  const all = getAllSettings();
  if (session && all[session.userId]) return all[session.userId];
  return { theme: "system", compactMode: false, notifications: true };
}
function updateSettingsForCurrentUser(patch) {
  const session = getCurrentSession();
  if (!session) return;
  const all = getAllSettings();
  const current = all[session.userId] || { theme: "system", compactMode: false, notifications: true };
  all[session.userId] = { ...current, ...patch };
  saveAllSettings(all);
  applyTheme();
  applyCompactMode();
}

function applyTheme() {
  const session = getCurrentSession();
  let theme = "system";
  if (session) {
    theme = getSettingsForCurrentUser().theme || "system";
  } else {
    theme = safeGet("campusfix_guest_theme", "system");
  }
  let resolved = theme;
  if (theme === "system") {
    resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (resolved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/* =========================================================================
   STATIC CONTENT — About & Security
   ========================================================================= */
function renderStaticContent(kind) {
  if (kind === "about") {
    return `
      <div class="card static-content">
        <h1>About CampusFix</h1>
        <p>CampusFix is a frontend-based campus issue reporting and resolution prototype developed as an academic CSE mini project.</p>
        <p>The application allows students to report campus problems and enables campus resolvers to review and manage those reports.</p>
        <p>Built using HTML5, CSS3, vanilla JavaScript and browser LocalStorage.</p>
        <p>Because this prototype does not use a backend, application data is stored locally in the browser.</p>
        <h2>Future Version</h2>
        <ul>
          <li>Centralized database</li>
          <li>College email authentication</li>
          <li>Server-side authorization</li>
          <li>Real-time notifications</li>
          <li>Administrator approval</li>
          <li>Cloud image storage</li>
          <li>Advanced image moderation</li>
          <li>Analytics</li>
          <li>Mobile application</li>
        </ul>
      </div>
    `;
  }
  return `
    <div class="card static-content">
      <h1>Security &amp; Privacy</h1>
      <p>CampusFix is a frontend-only academic prototype.</p>
      <ul>
        <li>Passwords are hashed before local storage.</li>
        <li>Active sessions use browser SessionStorage.</li>
        <li>Role-based permissions are checked before protected actions.</li>
        <li>Student reports are filtered by the logged-in student's ID.</li>
        <li>Resolver controls are restricted to resolver sessions.</li>
        <li>Uploaded images are validated and compressed locally.</li>
        <li>Basic text moderation prevents obvious inappropriate language.</li>
      </ul>
      <div class="disclaimer-box">
        Because this application runs entirely in the browser, it cannot provide the same security
        guarantees as a server-based production system. Browser storage can be inspected or modified
        by the device owner.
      </div>
      <div class="disclaimer-box">
        For production use, CampusFix would require server-side authentication, authorization,
        secure database storage, HTTPS, account verification, server-side validation, secure image
        storage and professional content moderation.
      </div>
      <p>Text filtering provides basic client-side protection. Production systems should perform
      server-side moderation as well.</p>
      <p>Advanced sexual-content or image safety detection would require a dedicated moderation
      model/service and is outside this offline prototype.</p>
    </div>
  `;
}

/* =========================================================================
   16. DASHBOARD ANALYTICS (student)
   ========================================================================= */
function computeStudentStats(studentUserId) {
  const issues = getIssuesForStudent(studentUserId);
  const statusOf = (i) => normalizeStatus(i && i.status);
  return {
    total: issues.length,
    pending: issues.filter((i) => statusOf(i) === "Reported").length,
    inProgress: issues.filter((i) => statusOf(i) === "Under Review" || statusOf(i) === "In Progress").length,
    resolved: issues.filter((i) => statusOf(i) === "Resolved").length
  };
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* =========================================================================
   12. STUDENT UI — Dashboard
   ========================================================================= */
function renderStudentDashboard() {
  const session = getCurrentSession();
  const stats = computeStudentStats(session.userId);
  const myIssues = getIssuesForStudent(session.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = myIssues.slice(0, 5);

  return `
    <div class="dash-header">
      <div>
        <h1>${greetingForNow()}, ${escapeHtml(session.name.split(" ")[0])}</h1>
        <p>Welcome back to CampusFix. Together, we can make your campus safer, cleaner and better.</p>
      </div>
      <div class="dash-header-actions">
        <button class="btn btn-primary" data-action="navigate" data-route="reportIssue">+ Report an Issue</button>
        <button class="btn btn-secondary" data-action="navigate" data-route="trackIssue">Track an Issue</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="card stat-card accent-primary"><div class="stat-label">My Reports</div><div class="stat-value">${stats.total}</div></div>
      <div class="card stat-card accent-info"><div class="stat-label">Pending</div><div class="stat-value">${stats.pending}</div></div>
      <div class="card stat-card accent-warning"><div class="stat-label">In Progress</div><div class="stat-value">${stats.inProgress}</div></div>
      <div class="card stat-card accent-success"><div class="stat-label">Resolved</div><div class="stat-value">${stats.resolved}</div></div>
    </div>

    <div class="section-heading"><h2>My Recent Reports</h2>
      ${myIssues.length ? `<button class="btn btn-ghost btn-sm" data-action="navigate" data-route="myIssues">View all</button>` : ""}
    </div>
    ${recent.length ? `<div class="issue-list">${recent.map((i) => studentIssueCardHtml(i)).join("")}</div>` : `
      <div class="card empty-state">
        <div class="empty-icon">📭</div>
        <h3>No issues reported yet.</h3>
        <p>See something that needs attention? Report it here.</p>
        <button class="btn btn-primary" data-action="navigate" data-route="reportIssue">Report Your First Issue</button>
      </div>
    `}

    <div class="impact-banner">
      <div class="impact-text">
        ${stats.total > 0 ? `You have reported ${stats.total} campus issue${stats.total === 1 ? "" : "s"}.` : "Your Campus Impact starts with your first report."}
      </div>
      <div style="color:var(--color-text-muted); font-size:13.5px;">Your Campus Impact</div>
    </div>
  `;
}

function studentIssueCardHtml(issue) {
  return `
    <div class="card issue-card">
      <div class="issue-card-main">
        <div class="issue-card-top">
          <span class="issue-id">${issue.id}</span>
          ${badgeHtml(issue.status, statusBadgeClass(issue.status))}
          ${badgeHtml(issue.priority, priorityBadgeClass(issue.priority))}
        </div>
        <div class="issue-title-text">${escapeHtml(issue.title)}</div>
        <div class="issue-meta">
          <span>🏷️ ${escapeHtml(issue.category)}</span>
          <span>📍 ${escapeHtml(issue.location)}${issue.room ? " · " + escapeHtml(issue.room) : ""}</span>
          <span>🗓️ ${formatDate(issue.createdAt)}</span>
        </div>
      </div>
      <div class="issue-card-actions">
        <button class="btn btn-secondary btn-sm" data-action="navigate" data-route="issueDetails" data-issue-id="${issue.id}">View Details</button>
      </div>
    </div>
  `;
}

/* =========================================================================
   9/10/11. STUDENT — REPORT ISSUE FORM
   ========================================================================= */
function renderReportIssue() {
  const categoryOptions = CONFIG.CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  const locationOptions = CONFIG.LOCATIONS.map((l) => `<option value="${l}">${l}</option>`).join("");
  const priorityOptions = CONFIG.PRIORITIES.map((p) => `
    <label class="priority-opt" data-priority="${p.value}" id="prioOpt-${p.value}">
      <input type="radio" name="priority" value="${p.value}" ${p.value === "Medium" ? "checked" : ""} />
      <div class="p-label">${p.value}</div>
      <div class="p-desc">${p.desc}</div>
    </label>
  `).join("");

  return `
    <div class="card" style="max-width:820px; margin:0 auto;">
      <h1>Report a Campus Issue</h1>
      <p>Tell us what is wrong and where it needs attention.</p>

      <form id="reportIssueForm" novalidate>
        <div class="field" id="field-title">
          <label for="inp-title">Issue Title</label>
          <input type="text" id="inp-title" name="title" maxlength="100" placeholder="e.g. Loose wires around classroom benches" />
          <div class="error-msg"></div>
        </div>

        <div class="form-grid">
          <div class="field" id="field-category">
            <label for="inp-category">Category</label>
            <select id="inp-category" name="category">
              <option value="">Select category</option>
              ${categoryOptions}
            </select>
            <div class="error-msg"></div>
          </div>
          <div class="field" id="field-location">
            <label for="inp-location">Location</label>
            <select id="inp-location" name="location">
              <option value="">Select location</option>
              ${locationOptions}
            </select>
            <div class="error-msg"></div>
          </div>
          <div class="field full hidden" id="field-customLocation">
            <label for="inp-customLocation">Specify Location</label>
            <input type="text" id="inp-customLocation" name="customLocation" />
            <div class="error-msg"></div>
          </div>
          <div class="field full" id="field-room">
            <label for="inp-room">Room / Area <span style="color:var(--color-text-muted); font-weight:400;">(optional)</span></label>
            <input type="text" id="inp-room" name="room" placeholder="e.g. CSE-204" />
          </div>
        </div>

        <div class="field">
          <label>Priority</label>
          <div class="priority-options">${priorityOptions}</div>
        </div>

        <div class="field" id="field-description">
          <label for="inp-description">Description</label>
          <textarea id="inp-description" name="description" maxlength="500" placeholder="Describe the issue in detail..."></textarea>
          <div class="char-counter" id="descCounter">0 / 500</div>
          <div class="error-msg"></div>
        </div>

        <div class="field">
          <label>Evidence Photo <span style="color:var(--color-text-muted); font-weight:400;">(optional)</span></label>
          <div class="photo-upload-box" id="photoUploadBox">
            <p>Upload a photo of the campus issue to help the resolver understand the problem.</p>
            <input type="file" id="inp-photo" accept="image/jpeg,image/png,image/webp" class="hidden" />
            <button type="button" class="btn btn-secondary btn-sm" id="choosePhotoBtn">Choose Photo</button>
            <div id="photoPreviewArea"></div>
          </div>
          <div class="error-msg" id="photoError" style="display:none; color:var(--color-danger); font-size:12.5px; margin-top:6px;"></div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-action="navigate" data-route="studentDashboard">Cancel</button>
          <button type="submit" class="btn btn-primary" id="submitIssueBtn">Submit Report</button>
        </div>
      </form>
    </div>
  `;
}

function bindReportIssue() {
  const form = document.getElementById("reportIssueForm");
  if (!form) return;

  const descInput = document.getElementById("inp-description");
  const counter = document.getElementById("descCounter");
  descInput.addEventListener("input", () => {
    const len = descInput.value.length;
    counter.textContent = `${len} / ${CONFIG.DESC_MAX}`;
    counter.classList.toggle("limit-near", len > CONFIG.DESC_MAX * 0.85 && len <= CONFIG.DESC_MAX);
    counter.classList.toggle("limit-over", len > CONFIG.DESC_MAX);
  });

  const locationSelect = document.getElementById("inp-location");
  locationSelect.addEventListener("change", () => {
    const customField = document.getElementById("field-customLocation");
    customField.classList.toggle("hidden", locationSelect.value !== "Other");
  });

  form.querySelectorAll('input[name="priority"]').forEach((radio) => {
    radio.addEventListener("change", updatePrioritySelectedStyles);
  });
  updatePrioritySelectedStyles();

  const fileInput = document.getElementById("inp-photo");
  const chooseBtn = document.getElementById("choosePhotoBtn");
  chooseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const photoError = document.getElementById("photoError");
    photoError.style.display = "none";
    chooseBtn.disabled = true;
    chooseBtn.textContent = "Processing...";
    const result = await processIssuePhoto(file);
    chooseBtn.disabled = false;
    chooseBtn.textContent = "Choose Photo";
    if (!result.ok) {
      photoError.textContent = result.error;
      photoError.style.display = "block";
      APP.photoDraft = null;
      renderPhotoPreview();
      return;
    }
    APP.photoDraft = result;
    renderPhotoPreview();
  });
  renderPhotoPreview();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const session = requireRole("student");
    if (!session) return;

    const title = form.title.value;
    const category = form.category.value;
    const location = form.location.value;
    const customLocation = form.customLocation ? form.customLocation.value.trim() : "";
    const room = form.room.value;
    const priorityInput = form.querySelector('input[name="priority"]:checked');
    const priority = priorityInput ? priorityInput.value : "";
    const description = form.description.value;

    let hasError = false;

    const titleErr = validateIssueTitle(title);
    if (titleErr) { setFieldError("field-title", titleErr); hasError = true; }

    if (!category) { setFieldError("field-category", "Please select a category."); hasError = true; }
    if (!location) { setFieldError("field-location", "Please select a location."); hasError = true; }
    if (location === "Other" && !customLocation) {
      setFieldError("field-customLocation", "Please specify the location.");
      hasError = true;
    }

    const descErr = validateIssueDescription(description);
    if (descErr) { setFieldError("field-description", descErr); hasError = true; }

    // Text moderation across relevant fields
    const modTitle = moderateText(title);
    const modDesc = moderateText(description);
    const modCustomLoc = customLocation ? moderateText(customLocation) : { ok: true };
    if (!modTitle.ok) { setFieldError("field-title", modTitle.error); hasError = true; }
    if (!modDesc.ok) { setFieldError("field-description", modDesc.error); hasError = true; }
    if (!modCustomLoc.ok) { setFieldError("field-customLocation", modCustomLoc.error); hasError = true; }

    if (hasError) return;

    const finalLocation = location === "Other" ? customLocation : location;

    const submitBtn = document.getElementById("submitIssueBtn");
    submitBtn.disabled = true;

    const result = createIssue({
      studentId: session.userId,
      studentName: session.name,
      title, category, location: finalLocation, room, priority, description,
      image: APP.photoDraft ? APP.photoDraft.dataUrl : null
    });

    submitBtn.disabled = false;

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    addNotification(session.userId, `Your issue ${result.issue.id} was submitted.`, "success");
    notifyAllResolvers(`New issue ${result.issue.id} has been reported.`, "info");
    if (priority === "High") {
      notifyAllResolvers(`High-priority issue reported in ${finalLocation}.`, "warning");
    }

    showIssueSuccessModal(result.issue);
  });
}

function updatePrioritySelectedStyles() {
  document.querySelectorAll(".priority-opt").forEach((opt) => {
    const checked = opt.querySelector("input").checked;
    const p = opt.getAttribute("data-priority").toLowerCase();
    opt.classList.toggle(`selected-${p}`, checked);
  });
}

function renderPhotoPreview() {
  const area = document.getElementById("photoPreviewArea");
  if (!area) return;
  if (!APP.photoDraft) { area.innerHTML = ""; return; }
  area.innerHTML = `
    <div class="photo-preview-wrap">
      <img src="${APP.photoDraft.dataUrl}" alt="Preview of uploaded evidence photo" />
      <button type="button" class="photo-remove-btn" id="removePhotoBtn" aria-label="Remove photo">✕</button>
    </div>
  `;
  document.getElementById("removePhotoBtn").addEventListener("click", () => {
    APP.photoDraft = null;
    document.getElementById("inp-photo").value = "";
    renderPhotoPreview();
  });
}

function showIssueSuccessModal(issue) {
  openModal({
    title: "",
    closable: false,
    bodyHtml: `
      <div class="success-screen">
        <div class="success-icon">✓</div>
        <h1>Issue Reported Successfully</h1>
        <p>Your report has been received by CampusFix.</p>
        <div class="success-detail-box">
          <div><span class="label">Issue ID</span><span class="value">${issue.id}</span></div>
          <div><span class="label">Status</span><span class="value">${issue.status}</span></div>
          <div><span class="label">Location</span><span class="value">${escapeHtml(issue.location)}</span></div>
        </div>
        <p style="font-size:12.5px;">Save your Issue ID if you want to reference this report later.</p>
      </div>
    `,
    footerHtml: `
      <button class="btn btn-secondary" data-action="closeAnd" data-route="myIssues">View My Issue</button>
      <button class="btn btn-secondary" data-action="closeAndTrack" data-issue-id="${issue.id}">Track Issue</button>
      <button class="btn btn-primary" data-action="closeAnd" data-route="reportIssue">Report Another</button>
    `
  });
}

/* =========================================================================
   14. SEARCH / FILTER (shared)
   ========================================================================= */
function filterAndSortIssues(issues, opts) {
  // FIX: Resolver Portal crash — opts could be undefined/partial and a few
  // seeded issues miss category/title, so String(...).includes threw and the
  // whole portal rendered blank. Everything below is null-safe.
  const list = Array.isArray(issues) ? issues : [];
  let result = [...list];
  const o = opts || {};
  const q = String(o.query || "").trim().toLowerCase();

  if (q) {
    result = result.filter((i) => {
      const item = i || {};
      // Search covers Issue ID, title, student name/ID, category, location.
      const haystacks = [item.id, item.title, item.location, item.category];
      if (o.includeStudentInSearch) haystacks.push(item.studentName, item.studentId);
      return haystacks.some((h) => h !== null && h !== undefined && String(h).toLowerCase().includes(q));
    });
  }
  if (o.status && o.status !== "All") result = result.filter((i) => normalizeStatus(i && i.status) === normalizeStatus(o.status));
  if (o.category && o.category !== "All") result = result.filter((i) => (i && i.category) === o.category);
  if (o.priority && o.priority !== "All") result = result.filter((i) => (i && i.priority) === o.priority);
  if (o.location && o.location !== "All") result = result.filter((i) => (i && i.location) === o.location);

  const priorityRank = { High: 3, Medium: 2, Low: 1 };
  switch (o.sort) {
    case "Oldest": result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case "Highest Priority": result.sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)); break;
    case "Recently Updated": result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); break;
    case "Newest":
    default: result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return result;
}

/* =========================================================================
   12. STUDENT UI — My Issues
   ========================================================================= */
function renderMyIssues() {
  const session = getCurrentSession();
  const all = getIssuesForStudent(session.userId);
  const f = APP.currentIssueFilters;

  const filtered = filterAndSortIssues(all, {
    query: f.query, status: f.status, category: f.category, priority: f.priority, sort: f.sort
  });

  return `
    <h1 style="font-size:20px; margin-bottom:16px;">My Issues</h1>
    <div class="toolbar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="issueSearchInput" placeholder="Search by ID, title or location" value="${escapeHtml(f.query || "")}" />
      </div>
      <select id="statusFilter">
        <option value="All">All Statuses</option>
        ${CONFIG.STATUSES.map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <select id="categoryFilter">
        <option value="All">All Categories</option>
        ${CONFIG.CATEGORIES.map((c) => `<option value="${c}" ${f.category === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
      <select id="priorityFilter">
        <option value="All">All Priorities</option>
        ${["Low", "Medium", "High"].map((p) => `<option value="${p}" ${f.priority === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
      <select id="sortFilter">
        ${["Newest", "Oldest", "Highest Priority", "Recently Updated"].map((s) => `<option value="${s}" ${f.sort === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <button class="btn btn-ghost btn-sm" id="clearFiltersBtn">Clear filters</button>
    </div>
    <div class="result-count">Showing ${filtered.length} of ${all.length} reports</div>
    ${filtered.length ? `<div class="issue-list">${filtered.map((i) => studentIssueCardHtmlWithTrack(i)).join("")}</div>` : `
      <div class="card empty-state">
        <div class="empty-icon">🔎</div>
        <h3>No matching reports</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    `}
  `;
}

function studentIssueCardHtmlWithTrack(issue) {
  const safe = issue || {};
  const st = normalizeStatus(safe.status) || "Reported";
  return `
    <div class="card issue-card">
      <div class="issue-card-main">
        <div class="issue-card-top">
          <span class="issue-id">${escapeHtml(safe.id || "—")}</span>
          ${badgeHtml(st, statusBadgeClass(st))}
          ${badgeHtml(safe.priority || "Medium", priorityBadgeClass(safe.priority || "Medium"))}
        </div>
        <div class="issue-title-text">${escapeHtml(safe.title || "(untitled report)")}</div>
        <div class="issue-meta">
          <span>🏷️ ${escapeHtml(safe.category || "—")}</span>
          <span>📍 ${escapeHtml(safe.location || "—")}</span>
          <span>🗓️ ${formatDate(safe.createdAt)}</span>
        </div>
      </div>
      <div class="issue-card-actions">
        <button class="btn btn-secondary btn-sm" data-action="navigate" data-route="issueDetails" data-issue-id="${escapeHtml(safe.id || "")}">View Details</button>
      </div>
    </div>
  `;
}

function bindMyIssues() {
  const search = document.getElementById("issueSearchInput");
  const status = document.getElementById("statusFilter");
  const category = document.getElementById("categoryFilter");
  const priority = document.getElementById("priorityFilter");
  const sort = document.getElementById("sortFilter");
  const clearBtn = document.getElementById("clearFiltersBtn");

  const rerender = () => {
    APP.currentIssueFilters = {
      query: search.value, status: status.value, category: category.value,
      priority: priority.value, sort: sort.value
    };
    render();
  };
  search.addEventListener("input", debounce(rerender, 200));
  [status, category, priority, sort].forEach((el) => el.addEventListener("change", rerender));
  clearBtn.addEventListener("click", () => {
    APP.currentIssueFilters = {};
    render();
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* =========================================================================
   12. STUDENT UI — Issue Details
   ========================================================================= */
function timelineHtml(currentStatus) {
  const steps = CONFIG.STATUSES;
  const st = normalizeStatus(currentStatus) || "Reported";
  const currentIdx = CONFIG.STATUS_ORDER[st] ?? 0;
  return `
    <div class="timeline">
      ${steps.map((s, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        return `
          <div class="timeline-step ${done ? "done" : ""} ${current ? "current" : ""}">
            <div>
              <div class="timeline-dot">${done ? "✓" : idx + 1}</div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-label">${s}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStudentIssueDetails(issueId) {
  const session = getCurrentSession();
  const issue = issueId ? findIssueById(issueId) : null;
  if (!session || !issue || issue.studentId !== session.userId) {
    return `
      <div class="card empty-state">
        <div class="empty-icon">🚫</div>
        <h3>Report not found</h3>
        <p>We could not find that issue on your account.</p>
        <button class="btn btn-primary" data-action="navigate" data-route="myIssues">Back to My Issues</button>
      </div>
    `;
  }

  const st = normalizeStatus(issue.status) || "Reported";
  return `
    <button class="btn btn-ghost btn-sm" data-action="navigate" data-route="myIssues" style="margin-bottom:14px;">&larr; Back to My Issues</button>
    <div class="detail-grid">
      <div>
        <div class="card">
          <div class="issue-card-top" style="margin-bottom:6px;">
            <span class="issue-id">${escapeHtml(issue.id)}</span>
            ${badgeHtml(st, statusBadgeClass(st))}
            ${badgeHtml(issue.priority || "Medium", priorityBadgeClass(issue.priority || "Medium"))}
          </div>
          <h2>${escapeHtml(issue.title || "(untitled report)")}</h2>
          <p>${escapeHtml(issue.description || "")}</p>
          <div class="detail-row"><span class="dr-label">Category</span><span class="dr-value">${escapeHtml(issue.category || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Location</span><span class="dr-value">${escapeHtml(issue.location || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Room</span><span class="dr-value">${escapeHtml(issue.room || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Submitted</span><span class="dr-value">${formatDate(issue.createdAt)}</span></div>
          <div class="detail-row"><span class="dr-label">Last Updated</span><span class="dr-value">${formatDate(issue.updatedAt)}</span></div>
          ${issue.image ? `<div style="margin-top:16px;"><img src="${issue.image}" alt="Evidence photo for ${escapeHtml(issue.id)}" class="evidence-img" data-action="zoomImage" data-src="${issue.image}" /></div>` : ""}
        </div>

        ${st === "Reported" ? `
          <div style="margin-top:14px;">
            <button class="btn btn-danger btn-sm" data-action="cancelIssue" data-issue-id="${escapeHtml(issue.id)}">Cancel This Report</button>
          </div>` : ""}
      </div>

      <div>
        <div class="card">
          <h3 style="font-size:15px;">Report Status</h3>
          ${timelineHtml(st)}
          ${issue.resolutionNote ? `
            <div class="resolver-update-box">
              <div class="ru-title">Resolver Update</div>
              <div>${escapeHtml(issue.resolutionNote)}</div>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

function bindStudentIssueDetails() {
  // zoom + cancel handled via global data-action dispatcher
}

/* =========================================================================
   12. STUDENT UI — Track Issue
   ========================================================================= */
function renderTrackIssue() {
  return `
    <div class="card" style="max-width:560px; margin:0 auto;">
      <h1>Track an Issue</h1>
      <p>Enter your Issue ID to see its latest status.</p>
      <div class="field">
        <label for="trackIdInput">Enter your Issue ID</label>
        <input type="text" id="trackIdInput" placeholder="e.g. CF-2026-1047" />
      </div>
      <button class="btn btn-primary btn-block" id="trackSubmitBtn">Track Issue</button>
      <div id="trackResultArea" style="margin-top:20px;"></div>
    </div>
  `;
}

function bindTrackIssue() {
  const btn = document.getElementById("trackSubmitBtn");
  const input = document.getElementById("trackIdInput");
  const resultArea = document.getElementById("trackResultArea");
  // FIX: resolver guards — the track view must no-op safely if its DOM is
  // absent and must use the normalized status everywhere.
  if (!btn || !input || !resultArea) return;
  const session = getCurrentSession();

  const doTrack = () => {
    const rawVal = input.value;
    const id = rawVal ? rawVal.trim() : "";
    if (!id) { resultArea.innerHTML = ""; return; }
    const issue = findIssueById(id);
    if (!session || !issue || issue.studentId !== session.userId) {
      resultArea.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No report associated with your account was found.</h3></div>`;
      return;
    }
    const st = normalizeStatus(issue.status) || "Reported";
    resultArea.innerHTML = `
      <div class="issue-card-top" style="margin-bottom:8px;">
        <span class="issue-id">${escapeHtml(issue.id)}</span>
        ${badgeHtml(st, statusBadgeClass(st))}
        ${badgeHtml(issue.priority || "Medium", priorityBadgeClass(issue.priority || "Medium"))}
      </div>
      <h3 style="font-size:16px;">${escapeHtml(issue.title || "(untitled report)")}</h3>
      <div class="detail-row"><span class="dr-label">Location</span><span class="dr-value">${escapeHtml(issue.location || "—")}</span></div>
      <div class="detail-row"><span class="dr-label">Submitted</span><span class="dr-value">${formatDate(issue.createdAt)}</span></div>
      ${timelineHtml(st)}
      ${issue.resolutionNote ? `<div class="resolver-update-box"><div class="ru-title">Resolver Update</div><div>${escapeHtml(issue.resolutionNote)}</div></div>` : ""}
      <button class="btn btn-secondary btn-sm" style="margin-top:14px;" data-action="navigate" data-route="issueDetails" data-issue-id="${escapeHtml(issue.id)}">View Full Details</button>
    `;
  };
  btn.addEventListener("click", doTrack);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doTrack(); });
}

/* =========================================================================
   13. RESOLVER UI — Dashboard
   ========================================================================= */
function computeCampusStats() {
  // FIX: all counts derive live from campusfix_issues (single source of truth)
  // and legacy statuses are normalized, so demo/old data can't desync the portal.
  const issues = getIssues();
  const statusOf = (i) => normalizeStatus(i && i.status);
  return {
    total: issues.length,
    newReports: issues.filter((i) => statusOf(i) === "Reported").length,
    underReview: issues.filter((i) => statusOf(i) === "Under Review").length,
    inProgress: issues.filter((i) => statusOf(i) === "In Progress").length,
    resolved: issues.filter((i) => statusOf(i) === "Resolved").length,
    highPriority: issues.filter((i) => (i && i.priority) === "High" && statusOf(i) !== "Resolved").length
  };
}

function resolverIssueCardHtml(issue) {
  // FIX: guard for sparse/legacy issue rows so one bad record can't blank the list.
  const safe = issue || {};
  return `
    <div class="card issue-card">
      <div class="issue-card-main">
        <div class="issue-card-top">
          <span class="issue-id">${escapeHtml(safe.id || "—")}</span>
          ${badgeHtml(normalizeStatus(safe.status) || "Reported", statusBadgeClass(normalizeStatus(safe.status) || "Reported"))}
          ${badgeHtml(safe.priority || "Medium", priorityBadgeClass(safe.priority || "Medium"))}
        </div>
        <div class="issue-title-text">${escapeHtml(safe.title || "(untitled report)")}</div>
        <div class="issue-meta">
          <span>👤 ${escapeHtml(safe.studentName || "—")}</span>
          <span>🏷️ ${escapeHtml(safe.category || "—")}</span>
          <span>📍 ${escapeHtml(safe.location || "—")}</span>
          <span>🗓️ ${formatDate(safe.createdAt)}</span>
        </div>
      </div>
      <div class="issue-card-actions">
        <button class="btn btn-primary btn-sm" data-action="navigate" data-route="resolverIssueDetails" data-issue-id="${escapeHtml(safe.id || "")}">Open Issue</button>
      </div>
    </div>
  `;
}

function renderResolverDashboard() {
  const session = getCurrentSession();
  const stats = computeCampusStats();
  const issues = getIssues();

  const needingAttention = issues
    .filter((i) => normalizeStatus(i && i.status) === "Reported" || normalizeStatus(i && i.status) === "Under Review")
    .sort((a, b) => {
      const rank = { High: 3, Medium: 2, Low: 1 };
      if (rank[b.priority] !== rank[a.priority]) return rank[b.priority] - rank[a.priority];
      return new Date(a.createdAt) - new Date(b.createdAt);
    })
    .slice(0, 5);

  const recent = [...issues].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return `
    <div class="dash-header">
      <div>
        <h1>Resolver Dashboard</h1>
        <p>Review reports. Coordinate resolutions. Improve the campus.</p>
      </div>
      <div class="dash-header-actions">
        ${issues.length === 0 || !issues.some((i) => i.isDemo) ? `<button class="btn btn-secondary" data-action="loadDemoData">Load Presentation Demo</button>` : `<button class="btn btn-ghost" data-action="clearDemoData">Clear Demo Data</button>`}
      </div>
    </div>

    <div class="stat-grid">
      <div class="card stat-card accent-primary"><div class="stat-label">Total Reports</div><div class="stat-value">${stats.total}</div></div>
      <div class="card stat-card accent-info"><div class="stat-label">New Reports</div><div class="stat-value">${stats.newReports}</div></div>
      <div class="card stat-card accent-warning"><div class="stat-label">Under Review</div><div class="stat-value">${stats.underReview}</div></div>
      <div class="card stat-card accent-success"><div class="stat-label">Resolved</div><div class="stat-value">${stats.resolved}</div></div>
    </div>
    <div class="stat-grid" style="margin-top:16px;">
      <div class="card stat-card accent-info"><div class="stat-label">In Progress</div><div class="stat-value">${stats.inProgress}</div></div>
      <div class="card stat-card accent-danger"><div class="stat-label">High Priority</div><div class="stat-value">${stats.highPriority}</div></div>
    </div>

    <div class="section-heading"><h2>Reports Needing Attention</h2></div>
    ${needingAttention.length ? `<div class="issue-list">${needingAttention.map(resolverIssueCardHtml).join("")}</div>` : `
      <div class="card empty-state"><div class="empty-icon">✅</div><h3>Nothing urgent right now</h3><p>New and under-review reports will show up here.</p></div>
    `}

    <div class="section-heading"><h2>Recent Student Reports</h2>
      ${issues.length ? `<button class="btn btn-ghost btn-sm" data-action="navigate" data-route="allIssues">View all</button>` : ""}
    </div>
    ${recent.length ? `<div class="issue-list">${recent.map(resolverIssueCardHtml).join("")}</div>` : `
      <div class="card empty-state"><div class="empty-icon">📭</div><h3>No reports yet</h3><p>Load presentation demo data or wait for student submissions.</p></div>
    `}
  `;
}

/* =========================================================================
   13. RESOLVER UI — All Issues
   ========================================================================= */
function renderAllIssues() {
  const all = getIssues();
  const f = APP.currentIssueFilters;
  const filtered = filterAndSortIssues(all, {
    query: f.query, status: f.status, category: f.category, priority: f.priority,
    location: f.location, sort: f.sort, includeStudentInSearch: true
  });

  return `
    <h1 style="font-size:20px; margin-bottom:16px;">All Campus Issues</h1>
    <div class="toolbar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="issueSearchInput" placeholder="Search by ID, student, title or location" value="${escapeHtml(f.query || "")}" />
      </div>
      <select id="statusFilter">
        <option value="All">All Statuses</option>
        ${CONFIG.STATUSES.map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <select id="categoryFilter">
        <option value="All">All Categories</option>
        ${CONFIG.CATEGORIES.map((c) => `<option value="${c}" ${f.category === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
      <select id="priorityFilter">
        <option value="All">All Priorities</option>
        ${["Low", "Medium", "High"].map((p) => `<option value="${p}" ${f.priority === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
      <select id="locationFilter">
        <option value="All">All Locations</option>
        ${CONFIG.LOCATIONS.map((l) => `<option value="${l}" ${f.location === l ? "selected" : ""}>${l}</option>`).join("")}
      </select>
      <select id="sortFilter">
        ${["Newest", "Oldest", "Highest Priority", "Recently Updated"].map((s) => `<option value="${s}" ${f.sort === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <button class="btn btn-ghost btn-sm" id="clearFiltersBtn">Clear filters</button>
    </div>
    <div class="result-count">Showing ${filtered.length} of ${all.length} reports</div>
    ${filtered.length ? `<div class="issue-list">${filtered.map(resolverIssueCardHtml).join("")}</div>` : `
      <div class="card empty-state"><div class="empty-icon">🔎</div><h3>No matching reports</h3><p>Try adjusting your search or filters.</p></div>
    `}
  `;
}

function bindAllIssues() {
  const search = document.getElementById("issueSearchInput");
  const status = document.getElementById("statusFilter");
  const category = document.getElementById("categoryFilter");
  const priority = document.getElementById("priorityFilter");
  const location = document.getElementById("locationFilter");
  const sort = document.getElementById("sortFilter");
  const clearBtn = document.getElementById("clearFiltersBtn");

  const rerender = () => {
    APP.currentIssueFilters = {
      query: search.value, status: status.value, category: category.value,
      priority: priority.value, location: location.value, sort: sort.value
    };
    render();
  };
  search.addEventListener("input", debounce(rerender, 200));
  [status, category, priority, location, sort].forEach((el) => el.addEventListener("change", rerender));
  clearBtn.addEventListener("click", () => { APP.currentIssueFilters = {}; render(); });
}

/* =========================================================================
   13. RESOLVER UI — Issue Workspace (details + status update)
   ========================================================================= */
function renderResolverIssueDetails(issueId) {
  const issue = findIssueById(issueId);
  if (!issue) {
    return `
      <div class="card empty-state">
        <div class="empty-icon">🚫</div><h3>Issue not found</h3>
        <button class="btn btn-primary" data-action="navigate" data-route="allIssues">Back to All Issues</button>
      </div>
    `;
  }
  const st = normalizeStatus(issue.status) || "Reported";
  const statusOptions = CONFIG.STATUSES.map((s) => `<option value="${s}" ${s === st ? "selected" : ""}>${s}</option>`).join("");

  return `
    <button class="btn btn-ghost btn-sm" data-action="navigate" data-route="allIssues" style="margin-bottom:14px;">&larr; Back to All Issues</button>
    <div class="detail-grid">
      <div>
        <div class="card">
          <div class="issue-card-top" style="margin-bottom:6px;">
            <span class="issue-id">${escapeHtml(issue.id)}</span>
            ${badgeHtml(st, statusBadgeClass(st))}
            ${badgeHtml(issue.priority || "Medium", priorityBadgeClass(issue.priority || "Medium"))}
          </div>
          <h2>${escapeHtml(issue.title || "(untitled report)")}</h2>
          <p>${escapeHtml(issue.description || "")}</p>

          <h3 style="font-size:14px; margin-top:18px;">Student Information</h3>
          <div class="detail-row"><span class="dr-label">Student Name</span><span class="dr-value">${escapeHtml(issue.studentName || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Student ID</span><span class="dr-value">${escapeHtml(issue.studentId || "—")}</span></div>

          <h3 style="font-size:14px; margin-top:18px;">Issue Information</h3>
          <div class="detail-row"><span class="dr-label">Category</span><span class="dr-value">${escapeHtml(issue.category || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Location</span><span class="dr-value">${escapeHtml(issue.location || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Room</span><span class="dr-value">${escapeHtml(issue.room || "—")}</span></div>
          <div class="detail-row"><span class="dr-label">Submitted</span><span class="dr-value">${formatDate(issue.createdAt)}</span></div>
          <div class="detail-row"><span class="dr-label">Last Updated</span><span class="dr-value">${formatDate(issue.updatedAt)}</span></div>

          ${issue.image ? `
            <h3 style="font-size:14px; margin-top:18px;">Evidence</h3>
            <img src="${issue.image}" alt="Evidence photo for ${escapeHtml(issue.id)}" class="evidence-img" data-action="zoomImage" data-src="${issue.image}" />
          ` : `<p style="margin-top:14px; font-size:13px;">No evidence photo was attached.</p>`}
        </div>
      </div>

      <div>
        <div class="card">
          <h3 style="font-size:15px;">Update Status</h3>
          <div class="field">
            <label for="statusSelect">Status</label>
            <select id="statusSelect">${statusOptions}</select>
          </div>
          <div class="field">
            <label for="resolutionNoteInput">Resolution Note</label>
            <textarea id="resolutionNoteInput" placeholder="Explain what has been done...">${escapeHtml(issue.resolutionNote || "")}</textarea>
            <div class="error-msg" id="resolutionNoteError" style="display:none; color:var(--color-danger); font-size:12.5px; margin-top:6px;"></div>
          </div>
          <button class="btn btn-primary btn-block" id="saveUpdateBtn" data-issue-id="${issue.id}">Save Update</button>
        </div>
        <div class="card" style="margin-top:16px;">
          <h3 style="font-size:14px;">Status Timeline</h3>
          ${timelineHtml(issue.status)}
        </div>
      </div>
    </div>
  `;
}

function bindResolverIssueDetails(issueId) {
  const btn = document.getElementById("saveUpdateBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    // Admin/demo-admin shares the resolver workspace in this frontend demo.
    const session = getCurrentSession();
    if (!session || !(session.role === "resolver" || session.role === "admin")) {
      showToast("Resolver access required.", "error");
      return;
    }
    const statusSelect = document.getElementById("statusSelect");
    const noteInput = document.getElementById("resolutionNoteInput");
    const noteError = document.getElementById("resolutionNoteError");
    if (noteError) noteError.style.display = "none";

    const newStatus = statusSelect ? normalizeStatus(statusSelect.value) : "";
    const note = noteInput ? noteInput.value.trim() : "";

    if (newStatus === "Resolved" && !note) {
      if (noteError) {
        noteError.textContent = "Please add a resolution note before marking this issue as resolved.";
        noteError.style.display = "block";
      } else {
        showToast("Please add a resolution note before marking this issue as resolved.", "error");
      }
      return;
    }

    if (note) {
      const mod = moderateText(note);
      if (!mod.ok) {
        if (noteError) {
          noteError.textContent = mod.error;
          noteError.style.display = "block";
        } else {
          showToast(mod.error, "error");
        }
        return;
      }
    }

    const issue = findIssueById(issueId);
    if (!issue) { showToast("Issue not found. It may have been removed.", "error"); return; }
    const statusChanged = normalizeStatus(issue.status) !== newStatus;

    btn.disabled = true;
    const result = updateIssue(issueId, {
      status: newStatus,
      resolutionNote: note,
      resolverId: session.userId,
      resolverName: session.name
    });
    btn.disabled = false;

    if (!result.ok) { showToast(result.error, "error"); return; }

    if (statusChanged) {
      addNotification(issue.studentId, `Your issue ${issue.id} is now ${newStatus}.`, "info");
    }

    showToast("Issue updated successfully.", "success");
    render();
  });
}

/* =========================================================================
   13. RESOLVER UI — Campus Overview / Analytics
   ========================================================================= */
function renderCampusOverview() {
  const issues = getIssues();
  const total = issues.length;
  const statusOf = (i) => normalizeStatus(i && i.status);
  const resolved = issues.filter((i) => statusOf(i) === "Resolved").length;
  const unresolved = total - resolved;
  const highPriority = issues.filter((i) => (i && i.priority) === "High" && statusOf(i) !== "Resolved").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const categoryCounts = {};
  CONFIG.CATEGORIES.forEach((c) => (categoryCounts[c] = 0));
  issues.forEach((i) => { if (categoryCounts[i.category] !== undefined) categoryCounts[i.category]++; });
  const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts));
  const mostReportedCategory = total > 0
    ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]
    : "—";

  const locationCounts = {};
  issues.forEach((i) => { locationCounts[i.location] = (locationCounts[i.location] || 0) + 1; });
  const mostAffectedLocation = total > 0 && Object.keys(locationCounts).length
    ? Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0][0]
    : "—";

  return `
    <h1 style="font-size:20px; margin-bottom:16px;">Campus Overview</h1>
    ${total === 0 ? `<div class="card empty-state"><div class="empty-icon">📊</div><h3>Not enough data yet.</h3><p>Analytics will appear once issues are reported.</p></div>` : `
    <div class="stat-grid">
      <div class="card stat-card accent-primary"><div class="stat-label">Total Issues</div><div class="stat-value">${total}</div></div>
      <div class="card stat-card accent-success"><div class="stat-label">Resolved</div><div class="stat-value">${resolved}</div></div>
      <div class="card stat-card accent-warning"><div class="stat-label">Unresolved</div><div class="stat-value">${unresolved}</div></div>
      <div class="card stat-card accent-danger"><div class="stat-label">High Priority</div><div class="stat-value">${highPriority}</div></div>
    </div>

    <div class="section-heading"><h2>Resolution Rate</h2></div>
    <div class="card">
      <div class="bar-row">
        <div class="bar-label">Resolved</div>
        <div class="bar-track"><div class="bar-fill" style="width:${resolutionRate}%;"></div></div>
        <div class="bar-value">${resolutionRate}%</div>
      </div>
    </div>

    <div class="section-heading"><h2>Issues by Category</h2></div>
    <div class="card">
      ${CONFIG.CATEGORIES.map((c) => `
        <div class="bar-row">
          <div class="bar-label">${c}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(categoryCounts[c] / maxCategoryCount) * 100}%;"></div></div>
          <div class="bar-value">${categoryCounts[c]}</div>
        </div>
      `).join("")}
    </div>

    <div class="stat-grid" style="margin-top:20px;">
      <div class="card stat-card"><div class="stat-label">Most Reported Category</div><div class="stat-value" style="font-size:18px;">${escapeHtml(mostReportedCategory)}</div></div>
      <div class="card stat-card"><div class="stat-label">Most Affected Location</div><div class="stat-value" style="font-size:18px;">${escapeHtml(mostAffectedLocation)}</div></div>
    </div>
    `}
  `;
}

/* =========================================================================
   PROFILE
   ========================================================================= */
function renderProfile() {
  const session = getCurrentSession();
  const user = getCurrentUserRecord();
  if (!user) return `<div class="card empty-state"><h3>Profile not found</h3></div>`;

  const isStudentRole = user.role === "student";
  return `
    <div class="card" style="max-width:640px;">
      <div class="profile-header">
        <div class="profile-avatar">${initials(user.name)}</div>
        <div>
          <h2>${escapeHtml(user.name)}</h2>
          <div style="color:var(--color-text-muted); font-size:13.5px;">${isStudentRole ? "Student" : "Campus Resolver"} · ${escapeHtml(user.userId)}</div>
        </div>
      </div>
      <div class="detail-row"><span class="dr-label">${isStudentRole ? "Student ID" : "Resolver ID"}</span><span class="dr-value">${escapeHtml(user.userId)}</span></div>
      ${isStudentRole ? `
        <div class="detail-row"><span class="dr-label">Department</span><span class="dr-value">${escapeHtml(user.department || "—")}</span></div>
        <div class="detail-row"><span class="dr-label">Year</span><span class="dr-value">${escapeHtml(user.year || "—")}</span></div>
      ` : `
        <div class="detail-row"><span class="dr-label">Role</span><span class="dr-value">Campus Resolver</span></div>
      `}
      <div class="detail-row"><span class="dr-label">Account Created</span><span class="dr-value">${formatDate(user.createdAt)}</span></div>
    </div>

    <div class="card" style="max-width:640px; margin-top:18px;">
      <h3 style="font-size:15px;">Change Password</h3>
      <form id="changePasswordForm" novalidate>
        <div class="field" id="field-currentPassword">
          <label for="inp-currentPassword">Current Password</label>
          <input type="password" id="inp-currentPassword" name="currentPassword" autocomplete="current-password" />
          <div class="error-msg"></div>
        </div>
        <div class="field" id="field-newPassword">
          <label for="inp-newPassword">New Password</label>
          <input type="password" id="inp-newPassword" name="newPassword" autocomplete="new-password" />
          <div class="error-msg"></div>
        </div>
        <div class="field" id="field-confirmNewPassword">
          <label for="inp-confirmNewPassword">Confirm New Password</label>
          <input type="password" id="inp-confirmNewPassword" name="confirmNewPassword" autocomplete="new-password" />
          <div class="error-msg"></div>
        </div>
        <button type="submit" class="btn btn-primary">Update Password</button>
      </form>
    </div>
  `;
}

function bindProfile() {
  const form = document.getElementById("changePasswordForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const session = getCurrentSession();
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmNewPassword = form.confirmNewPassword.value;

    let hasError = false;
    if (!currentPassword) { setFieldError("field-currentPassword", "Please enter your current password."); hasError = true; }
    const pwErr = validatePassword(newPassword);
    if (pwErr) { setFieldError("field-newPassword", pwErr); hasError = true; }
    if (confirmNewPassword !== newPassword) { setFieldError("field-confirmNewPassword", "Passwords do not match."); hasError = true; }
    if (hasError) return;

    const result = await changeUserPassword(session.userId, currentPassword, newPassword);
    if (!result.ok) {
      setFieldError("field-currentPassword", result.error);
      showToast(result.error, "error");
      return;
    }
    showToast("Password updated successfully.", "success");
    form.reset();
  });
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
function renderSettings() {
  const session = getCurrentSession();
  const user = getCurrentUserRecord();
  const settings = getSettingsForCurrentUser();
  const isStudentRole = session.role === "student";

  return `
    <div class="card" style="max-width:640px;">
      <h3 style="font-size:15px;">Appearance</h3>
      <label class="hint" style="display:block; margin-bottom:6px;">Theme</label>
      <div class="theme-option-row">
        <button class="theme-opt ${settings.theme === "light" ? "active" : ""}" data-action="setTheme" data-theme="light">☀️ Light</button>
        <button class="theme-opt ${settings.theme === "dark" ? "active" : ""}" data-action="setTheme" data-theme="dark">🌙 Dark</button>
        <button class="theme-opt ${settings.theme === "system" ? "active" : ""}" data-action="setTheme" data-theme="system">🖥️ System</button>
      </div>
      <div class="toggle-row">
        <div><div class="tr-title">Compact Mode</div><div class="tr-desc">Reduce spacing for denser layouts.</div></div>
        <label class="switch"><input type="checkbox" id="compactModeToggle" ${settings.compactMode ? "checked" : ""} /><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div><div class="tr-title">Notifications</div><div class="tr-desc">Receive in-app status updates.</div></div>
        <label class="switch"><input type="checkbox" id="notifToggle" ${settings.notifications !== false ? "checked" : ""} /><span class="slider"></span></label>
      </div>
    </div>

    <div class="card" style="max-width:640px; margin-top:18px;">
      <h3 style="font-size:15px;">Account Details</h3>
      <form id="settingsProfileForm" novalidate>
        <div class="field">
          <label for="set-name">Name</label>
          <input type="text" id="set-name" value="${escapeHtml(user.name)}" />
        </div>
        ${isStudentRole ? `
          <div class="form-grid">
            <div class="field"><label for="set-department">Department</label><input type="text" id="set-department" value="${escapeHtml(user.department || "")}" /></div>
            <div class="field"><label for="set-year">Year</label>
              <select id="set-year">
                <option value="1st Year" ${user.year === "1st Year" ? "selected" : ""}>1st Year</option>
                <option value="2nd Year" ${user.year === "2nd Year" ? "selected" : ""}>2nd Year</option>
                <option value="3rd Year" ${user.year === "3rd Year" ? "selected" : ""}>3rd Year</option>
                <option value="4th Year" ${user.year === "4th Year" ? "selected" : ""}>4th Year</option>
              </select>
            </div>
          </div>
        ` : ""}
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>

    <div class="card" style="max-width:640px; margin-top:18px; border-color:var(--color-danger);">
      <h3 style="font-size:15px; color:var(--color-danger);">Reset Local Application</h3>
      <p style="font-size:13px;">This removes all accounts, reports, notifications and settings stored in this browser.</p>
      <button class="btn btn-danger" data-action="confirmReset">Reset Everything</button>
    </div>
  `;
}

function bindSettings() {
  const compactToggle = document.getElementById("compactModeToggle");
  if (compactToggle) {
    compactToggle.addEventListener("change", () => {
      updateSettingsForCurrentUser({ compactMode: compactToggle.checked });
      showToast("Settings saved.", "success");
    });
  }
  const notifToggle = document.getElementById("notifToggle");
  if (notifToggle) {
    notifToggle.addEventListener("change", () => {
      updateSettingsForCurrentUser({ notifications: notifToggle.checked });
      showToast("Settings saved.", "success");
    });
  }
  const form = document.getElementById("settingsProfileForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const session = getCurrentSession();
      const name = document.getElementById("set-name").value.trim();
      const patch = { name };
      const deptEl = document.getElementById("set-department");
      const yearEl = document.getElementById("set-year");
      if (deptEl) patch.department = deptEl.value.trim();
      if (yearEl) patch.year = yearEl.value;
      if (!name) { showToast("Name cannot be empty.", "error"); return; }
      updateUserRecord(session.userId, patch);
      // keep session name in sync
      const s = getCurrentSession();
      s.name = name;
      sessionSafeSet(CONFIG.KEYS.SESSION, s);
      showToast("Settings saved.", "success");
      render();
    });
  }
}

/* =========================================================================
   20. DEMO DATA
   ========================================================================= */
const DEMO_ISSUE_TEMPLATES = [
  { title: "Loose wires around classroom benches", category: "Electrical", location: "CSE Block", room: "CSE-204", priority: "High", description: "Several wires are spread near the classroom benches and may create a safety risk for students.", status: "Reported" },
  { title: "Broken bench in last row", category: "Furniture", location: "Classroom", room: "B-12", priority: "Medium", description: "The last-row bench has a broken leg and wobbles when students sit on it.", status: "Under Review" },
  { title: "AC not cooling properly", category: "AC & Cooling", location: "Seminar Hall", room: "", priority: "Medium", description: "The air conditioning unit runs but does not cool the room during afternoon sessions.", status: "In Progress" },
  { title: "Classroom light not working", category: "Electrical", location: "Academic Block", room: "A-105", priority: "Low", description: "One tube light near the back of the room has stopped working.", status: "Reported" },
  { title: "Water leakage near washroom", category: "Plumbing", location: "Washroom", room: "", priority: "High", description: "Water is leaking from a pipe near the washroom entrance, making the floor slippery.", status: "Under Review" },
  { title: "Computer keyboard not working", category: "Laboratory", location: "Computer Lab", room: "Lab-3", priority: "Low", description: "The keyboard at system 14 does not register key presses correctly.", status: "Resolved" },
  { title: "Wi-Fi signal weak in classroom", category: "Wi-Fi / Network", location: "CSE Block", room: "CSE-201", priority: "Medium", description: "Wi-Fi signal drops frequently during lectures, making it hard to access study material.", status: "Reported" },
  { title: "Broken classroom chair", category: "Furniture", location: "Classroom", room: "B-04", priority: "Low", description: "A chair near the front row has a cracked backrest.", status: "In Progress" },
  { title: "Ceiling fan making unusual noise", category: "Electrical", location: "Academic Block", room: "A-202", priority: "Medium", description: "The ceiling fan makes a rattling noise at higher speeds.", status: "Resolved" },
  { title: "Cleanliness issue near corridor", category: "Cleanliness", location: "Corridor", room: "", priority: "Low", description: "Waste bins near the corridor have not been cleared for a couple of days.", status: "Reported" }
];

function loadDemoData() {
  const session = requireRole("resolver");
  if (!session) return;
  const issues = getIssues();
  const now = Date.now();
  DEMO_ISSUE_TEMPLATES.forEach((tpl, idx) => {
    const daysAgo = (DEMO_ISSUE_TEMPLATES.length - idx) * 1.3;
    const createdAt = new Date(now - daysAgo * 86400000).toISOString();
    const id = generateIssueId();
    const isResolvedOrProgress = tpl.status !== "Reported";
    issues.push({
      id,
      studentId: "STU-DEMO",
      studentName: "Demo Student",
      title: tpl.title,
      category: tpl.category,
      location: tpl.location,
      room: tpl.room,
      priority: tpl.priority,
      description: tpl.description,
      image: null,
      status: tpl.status,
      createdAt,
      updatedAt: isResolvedOrProgress ? new Date(now - (daysAgo - 0.5) * 86400000).toISOString() : createdAt,
      resolverId: isResolvedOrProgress ? session.userId : null,
      resolverName: isResolvedOrProgress ? session.name : null,
      resolutionNote: tpl.status === "Resolved" ? "Maintenance team has resolved the reported issue after inspection." : "",
      isDemo: true
    });
  });
  saveIssues(issues);
  showToast("Presentation demo data loaded.", "success");
  render();
}

function clearDemoData() {
  openModal({
    title: "Clear Demo Data?",
    bodyHtml: `<p>This removes all presentation demo issues. Real student reports will not be affected.</p>`,
    footerHtml: `
      <button class="btn btn-secondary" data-action="closeModal">Cancel</button>
      <button class="btn btn-danger" data-action="confirmClearDemo">Clear Demo Data</button>
    `
  });
}

function confirmClearDemo() {
  const issues = getIssues().filter((i) => !i.isDemo);
  saveIssues(issues);
  closeModal();
  showToast("Demo data cleared.", "success");
  render();
}

/* =========================================================================
   Route-specific event binding dispatcher
   ========================================================================= */
function bindRouteView(route) {
  switch (route) {
    case "reportIssue": bindReportIssue(); break;
    case "myIssues": bindMyIssues(); break;
    case "issueDetails": bindStudentIssueDetails(); break;
    case "trackIssue": bindTrackIssue(); break;
    case "allIssues": bindAllIssues(); break;
    case "resolverIssueDetails": bindResolverIssueDetails(APP.routeParams.issueId); break;
    case "profile": bindProfile(); break;
    case "settings": bindSettings(); break;
  }
}

/* =========================================================================
   GLOBAL DATA-ACTION DISPATCHER (event delegation)
   Handles all buttons marked with data-action="..." across every view.
   ========================================================================= */
function bindGlobalDataActions() {
  // Delegation is bound once globally in initApp(); this function exists
  // for symmetry with other bind* functions and is a safe no-op if called
  // multiple times (listener added only once via a guard flag).
}

function handleGlobalClick(e) {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.getAttribute("data-action");

  switch (action) {
    case "navigate": {
      const route = target.getAttribute("data-route");
      const issueId = target.getAttribute("data-issue-id");
      navigate(route, issueId ? { issueId } : {});
      break;
    }
    case "closeModal":
      closeModal();
      break;
    case "closeAnd": {
      const route = target.getAttribute("data-route");
      closeModal();
      navigate(route);
      break;
    }
    case "closeAndTrack": {
      const issueId = target.getAttribute("data-issue-id");
      closeModal();
      navigate("trackIssue");
      setTimeout(() => {
        const input = document.getElementById("trackIdInput");
        if (input) {
          input.value = issueId;
          document.getElementById("trackSubmitBtn").click();
        }
      }, 0);
      break;
    }
    case "logout":
      logoutUser();
      break;
    case "regenId": {
      const role = target.getAttribute("data-role");
      const input = document.getElementById("inp-userId");
      if (input) input.value = generateSuggestedId(role);
      break;
    }
    case "markAllRead":
      markAllNotificationsRead();
      closeModal();
      render();
      break;
    case "zoomImage": {
      const src = target.getAttribute("data-src");
      openModal({
        title: "Evidence Photo",
        wide: true,
        bodyHtml: `<img src="${src}" alt="Evidence photo, enlarged" class="zoom-img" />`
      });
      break;
    }
    case "cancelIssue": {
      const issueId = target.getAttribute("data-issue-id");
      confirmCancelIssue(issueId);
      break;
    }
    case "confirmCancelIssue": {
      const issueId = target.getAttribute("data-issue-id");
      deleteIssue(issueId);
      closeModal();
      showToast("Report cancelled.", "success");
      navigate("myIssues");
      break;
    }
    case "loadDemoData":
      loadDemoData();
      break;
    case "clearDemoData":
      clearDemoData();
      break;
    case "confirmClearDemo":
      confirmClearDemo();
      break;
    case "confirmReset":
      confirmResetPrompt();
      break;
    case "doResetAll":
      resetAllApplicationData();
      break;
    case "setTheme": {
      const theme = target.getAttribute("data-theme");
      updateSettingsForCurrentUser({ theme });
      showToast("Settings saved.", "success");
      render();
      break;
    }
    default:
      break;
  }
}

function confirmCancelIssue(issueId) {
  openModal({
    title: "Cancel this report?",
    bodyHtml: `<p>This will permanently remove report <strong>${issueId}</strong>. This action cannot be undone.</p>`,
    footerHtml: `
      <button class="btn btn-secondary" data-action="closeModal">Keep Report</button>
      <button class="btn btn-danger" data-action="confirmCancelIssue" data-issue-id="${issueId}">Cancel Report</button>
    `
  });
}

function confirmResetPrompt() {
  openModal({
    title: "Reset all local CampusFix data?",
    bodyHtml: `<p>All accounts, reports, notifications and settings stored in this browser will be permanently removed.</p>`,
    footerHtml: `
      <button class="btn btn-secondary" data-action="closeModal">Cancel</button>
      <button class="btn btn-danger" data-action="doResetAll">Reset Everything</button>
    `
  });
}

function resetAllApplicationData() {
  safeRemove(CONFIG.KEYS.USERS);
  safeRemove(CONFIG.KEYS.ISSUES);
  safeRemove(CONFIG.KEYS.NOTIFICATIONS);
  safeRemove(CONFIG.KEYS.SETTINGS);
  sessionSafeRemove(CONFIG.KEYS.SESSION);
  closeModal();
  showToast("All local CampusFix data has been reset.", "success");
  navigate("landing");
}

/* =========================================================================
   22. APPLICATION INITIALIZATION
   ========================================================================= */
function initApp() {
  // FIX: reliable boot order — storage check -> demo seed -> session restore ->
  // theme -> initial role route -> first paint. DOMContentLoaded guarantees
  // #app exists; render() itself never leaves a blank screen.
  STORAGE_AVAILABLE = checkStorageAvailable();
  try { loadDemoData(); } catch (seedErr) { console.error("[CampusFix] Demo seed failed:", seedErr); }

  // Single delegated click listener for the entire app lifetime.
  document.addEventListener("click", handleGlobalClick);

  applyTheme();
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const settings = getCurrentSession() ? getSettingsForCurrentUser() : { theme: safeGet("campusfix_guest_theme", "system") };
      if (settings.theme === "system") applyTheme();
    });
  }

  const session = getCurrentSession();
  // FIX: admin/demo-admin shares the resolver workspace; unknown roles fall
  // back to the student home instead of an empty view. Session persists via
  // LocalStorage (campusfix_session), so refresh restores the role home.
  APP.route = session
    ? ((session.role === "resolver" || session.role === "admin") ? "resolverDashboard" : "studentDashboard")
    : "landing";
  render();
}

document.addEventListener("DOMContentLoaded", initApp);
