// ===================== سيرفر إيجنت واتساب - مستشفى الموسي التخصصي =====================
const express = require("express");
const { processMessage, welcomeMessage } = require("./agent");
const { sendMessage } = require("./ultramsg");
const store = require("./store");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3300;
const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || "instance179001";

// ===================== CORS (للسماح للموقع بالاتصال بالإيجنت) =====================
// مسموح لكل المصادر لأن الموقع مستضاف على GitHub Pages (نطاق ثابت غير حساس)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ===================== إيجنت الشات داخل الموقع =====================
// يستخدم نفس منطق الإيجنت (agent.js) عبر معرف جلسة "web-xxxx" بدل رقم واتساب
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};

    if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("web-")) {
      return res.status(400).json({ status: "error", message: "sessionId غير صالح (يجب أن يبدأ بـ web-)" });
    }
    if (!message || typeof message !== "string") {
      return res.status(400).json({ status: "error", message: "message مطلوب" });
    }

    const reply = await processMessage(sessionId, message);

    return res.json({ status: "ok", reply: reply || "تم تحويلك إلى موظف الاستقبال، سيتم الرد عليك قريباً." });
  } catch (err) {
    console.error("❌ خطأ في /api/chat:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// رسالة الترحيب الابتدائية (تُستدعى عند فتح نافذة الشات لأول مرة)
app.get("/api/chat/welcome", (req, res) => {
  res.json({ status: "ok", reply: welcomeMessage() });
});

// ===================== Webhook استقبال رسائل واتساب من UltraMsg =====================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // UltraMsg يرسل البيانات داخل body.data عادة
    const data = body.data || body;

    // تجاهل الرسائل الصادرة من البوت نفسه (fromMe) ورسائل الحالة
    if (!data || data.fromMe === true || !data.body || data.type !== "chat") {
      return res.status(200).json({ status: "ignored" });
    }

    const from = data.from; // مثال: 9715XXXXXXXX@c.us
    const phone = String(from).split("@")[0];
    const text = data.body;

    console.log(`📩 رسالة واردة من ${phone}: ${text}`);

    const reply = await processMessage(phone, text);

    if (reply) {
      await sendMessage(phone, reply);
      console.log(`📤 تم الرد على ${phone}`);
    } else {
      console.log(`🔇 لا يوجد رد تلقائي (المحادثة محوّلة لموظف الاستقبال)`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("❌ خطأ في معالجة الـ webhook:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ===================== نقاط نهاية مساعدة (للوحة الإدارة / الاختبار) =====================

// عرض جميع الحجوزات
app.get("/api/bookings", (req, res) => {
  res.json(store.getBookings());
});

// عرض سجل التحويلات لموظف الاستقبال
app.get("/api/handoffs", (req, res) => {
  res.json(store.getHandoffs());
});

// عرض كل المحادثات (لأغراض التصحيح)
app.get("/api/conversations", (req, res) => {
  res.json(store.getConversations ? store.getConversations() : {});
});

// إنهاء تحويل محادثة وإعادتها للإيجنت
app.post("/api/handoffs/:phone/resolve", (req, res) => {
  const phone = req.params.phone;
  const conversation = store.getConversation(phone);
  conversation.handedOff = false;
  conversation.state = "idle";
  store.saveConversation(phone, conversation);
  res.json({ status: "ok", message: "تم إنهاء التحويل، الإيجنت سيستجيب من جديد." });
});

// فحص صحة السيرفر
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family:Tajawal,sans-serif; direction:rtl; padding:40px; text-align:center;">
      <h1>✚ إيجنت واتساب - مستشفى الموسي التخصصي</h1>
      <p>السيرفر يعمل بنجاح ✅</p>
      <p>Instance: ${ULTRAMSG_INSTANCE_ID}</p>
      <p>Webhook URL: <code>/webhook</code></p>
      <p>عدد الحجوزات: ${store.getBookings().length}</p>
      <p>عدد التحويلات: ${store.getHandoffs().length}</p>
    </div>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ سيرفر إيجنت مستشفى الموسي يعمل على المنفذ ${PORT}`);
  console.log(`🔗 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`📊 لوحة الفحص: http://localhost:${PORT}/`);
});
