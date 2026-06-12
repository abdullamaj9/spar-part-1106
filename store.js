// ===================== وحدة التخزين (JSON) =====================
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const HANDOFFS_FILE = path.join(DATA_DIR, "handoffs.json");

function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
}

function readJSON(filePath, defaultValue) {
  ensureFile(filePath, defaultValue);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error("خطأ في قراءة الملف:", filePath, e.message);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ---------- الحجوزات ----------
function getBookings() {
  return readJSON(BOOKINGS_FILE, []);
}

function saveBookings(bookings) {
  writeJSON(BOOKINGS_FILE, bookings);
}

function addBooking(booking) {
  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);
  return booking;
}

function updateBooking(id, updates) {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() };
  saveBookings(bookings);
  return bookings[idx];
}

function findBookingsByPhone(phone) {
  const normalized = normalizePhone(phone);
  return getBookings().filter((b) => normalizePhone(b.phone) === normalized && b.status !== "ملغى");
}

function isSlotTaken(doctorId, date, time, excludeBookingId = null) {
  return getBookings().some(
    (b) =>
      b.doctorId === doctorId &&
      b.date === date &&
      b.time === time &&
      b.status !== "ملغى" &&
      b.id !== excludeBookingId
  );
}

// ---------- تطبيع رقم الهاتف (محلي UAE <-> دولي) ----------
function normalizePhone(phone) {
  if (!phone) return "";
  // معرفات جلسات الشات داخل الموقع (web-xxxxx) تُترك كما هي
  if (String(phone).startsWith("web-")) return String(phone);
  let p = String(phone).replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  // تحويل الصيغة المحلية 05XXXXXXXX إلى الدولية 9715XXXXXXXX
  if (p.startsWith("0")) p = "971" + p.slice(1);
  // إذا كان الرقم بدون كود دولة (9 خانات تبدأ بـ5)
  if (p.length === 9 && p.startsWith("5")) p = "971" + p;
  return p;
}

// ---------- المحادثات (حالة كل عميل) ----------
function getConversations() {
  return readJSON(CONVERSATIONS_FILE, {});
}

function saveConversations(conversations) {
  writeJSON(CONVERSATIONS_FILE, conversations);
}

function getConversation(phone) {
  const conversations = getConversations();
  const key = normalizePhone(phone);
  return conversations[key] || { phone: key, state: "idle", data: {}, history: [], handedOff: false };
}

function saveConversation(phone, conversation) {
  const conversations = getConversations();
  const key = normalizePhone(phone);
  conversations[key] = conversation;
  saveConversations(conversations);
}

function resetConversation(phone) {
  const conversations = getConversations();
  const key = normalizePhone(phone);
  delete conversations[key];
  saveConversations(conversations);
}

// ---------- سجل التحويلات لموظف الاستقبال ----------
function getHandoffs() {
  return readJSON(HANDOFFS_FILE, []);
}

function addHandoff(record) {
  const handoffs = getHandoffs();
  handoffs.push(record);
  writeJSON(HANDOFFS_FILE, handoffs);
  return record;
}

module.exports = {
  getBookings,
  saveBookings,
  addBooking,
  updateBooking,
  findBookingsByPhone,
  isSlotTaken,
  normalizePhone,
  getConversation,
  saveConversation,
  resetConversation,
  getHandoffs,
  addHandoff,
};
