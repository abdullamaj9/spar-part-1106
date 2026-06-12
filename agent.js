// ===================== منطق إيجنت واتساب الذكي - مستشفى الموسي التخصصي =====================
const { DEPARTMENTS, DOCTORS, TIME_SLOTS, HOSPITAL_INFO } = require("./data");
const store = require("./store");
const { sendMessage, sendLocation } = require("./ultramsg");

const RECEPTION_PHONE = process.env.RECEPTION_PHONE || "971509788772";

// ===================== أدوات مساعدة =====================

function findDeptByText(text) {
  const t = text.trim().toLowerCase();
  return DEPARTMENTS.find((d) => t.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(t));
}

function findDeptByIndex(text) {
  const num = parseInt(text.trim(), 10);
  if (isNaN(num)) return null;
  return DEPARTMENTS[num - 1] || null;
}

function findDoctorsByDept(deptId) {
  return DOCTORS.filter((d) => d.dept === deptId);
}

function findDoctorByIndex(text, deptId) {
  const num = parseInt(text.trim(), 10);
  if (isNaN(num)) return null;
  const doctors = findDoctorsByDept(deptId);
  return doctors[num - 1] || null;
}

function findDoctorByName(text) {
  const t = text.trim().toLowerCase();
  return DOCTORS.find((d) => t.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(t));
}

function isValidDate(text) {
  // يقبل صيغة YYYY-MM-DD أو DD-MM-YYYY أو DD/MM/YYYY
  const t = text.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  if (iso.test(t)) return t;
  const m = t.match(dmy);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function isPastDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return target < today;
}

function genBookingId() {
  return "BK" + Date.now();
}

// ===================== رسائل ثابتة =====================

function welcomeMessage() {
  return (
    `🏥 *مرحباً بك في ${HOSPITAL_INFO.name}* ✚\n\n` +
    `أنا المساعد الذكي للمستشفى، يمكنني مساعدتك في:\n\n` +
    `1️⃣ حجز موعد جديد\n` +
    `2️⃣ الاستفسار عن الأقسام والأطباء\n` +
    `3️⃣ مواعيد العمل\n` +
    `4️⃣ عنوان المستشفى والموقع\n` +
    `5️⃣ تعديل موعد محجوز\n` +
    `6️⃣ إلغاء موعد\n` +
    `7️⃣ التحدث مع موظف الاستقبال\n\n` +
    `📝 يمكنك كتابة رقم الخدمة أو كتابة طلبك مباشرة بكلماتك.`
  );
}

function departmentsListMessage() {
  let msg = `🏥 *الأقسام الطبية في ${HOSPITAL_INFO.name}*\n\n`;
  DEPARTMENTS.forEach((d, i) => {
    msg += `${i + 1}. ${d.icon} ${d.name}\n`;
  });
  msg += `\nاكتب رقم القسم الذي تريد الحجز فيه، أو اكتب اسمه.`;
  return msg;
}

function doctorsListMessage(dept) {
  const doctors = findDoctorsByDept(dept.id);
  if (doctors.length === 0) {
    return `عذراً، لا يوجد أطباء متاحون حالياً في قسم ${dept.name}. سيتم تحويلك لموظف الاستقبال للمساعدة.`;
  }
  let msg = `${dept.icon} *قسم ${dept.name}*\n\nالأطباء المتاحون:\n\n`;
  doctors.forEach((doc, i) => {
    msg += `${i + 1}. ${doc.name}\n   ${doc.title} - خبرة ${doc.exp} سنة\n   💰 سعر الكشف: ${doc.fee} د.إ | ⏱ مدة الموعد: ${doc.duration} دقيقة\n\n`;
  });
  msg += `اكتب رقم الطبيب الذي تريد الحجز معه.`;
  return msg;
}

function workingHoursMessage() {
  return (
    `🕐 *أوقات العمل - ${HOSPITAL_INFO.name}*\n\n` +
    `العيادات الخارجية: 8:00 صباحاً - 10:00 مساءً\n` +
    `قسم الطوارئ: متاح على مدار الساعة (24/7) طوال أيام الأسبوع 🚑\n\n` +
    `للحجز اكتب "حجز" أو "1".`
  );
}

function locationMessage() {
  return (
    `📍 *عنوان ${HOSPITAL_INFO.name}*\n\n` +
    `${HOSPITAL_INFO.address}\n` +
    `📞 ${HOSPITAL_INFO.phone}\n` +
    `🚑 الطوارئ: ${HOSPITAL_INFO.emergency}\n` +
    `✉️ ${HOSPITAL_INFO.email}\n\n` +
    `🌐 الموقع الإلكتروني: ${HOSPITAL_INFO.website}\n\n` +
    `سيتم إرسال الموقع الجغرافي على الخريطة الآن 👇`
  );
}

function timeSlotsMessage(takenSlots = []) {
  let msg = `🕐 *الأوقات المتاحة:*\n\n`;
  TIME_SLOTS.forEach((t, i) => {
    const taken = takenSlots.includes(t);
    msg += `${i + 1}. ${t}${taken ? " ❌ (محجوز)" : " ✅"}\n`;
  });
  msg += `\nاكتب رقم الوقت المناسب لك.`;
  return msg;
}

function handoffMessage() {
  return (
    `🔄 تم تحويل طلبك إلى *موظف الاستقبال* وسيتواصل معك قريباً.\n\n` +
    `يمكنك أيضاً التواصل مباشرة على: ${HOSPITAL_INFO.phone}\n\n` +
    `للعودة للقائمة الرئيسية، اكتب "القائمة".`
  );
}

function genericErrorMessage() {
  return `⚠️ لم أتمكن من فهم طلبك. اكتب "القائمة" لعرض الخيارات المتاحة، أو "موظف" للتحدث مع موظف الاستقبال.`;
}

// ===================== التحويل لموظف الاستقبال =====================

async function handoffToReception(phone, conversation, reason, lastMessage) {
  conversation.handedOff = true;
  conversation.state = "with_reception";
  store.saveConversation(phone, conversation);

  // 1. تسجيل في ملف handoffs.json
  store.addHandoff({
    id: "HO" + Date.now(),
    phone: store.normalizePhone(phone),
    reason,
    lastMessage: lastMessage || "",
    createdAt: new Date().toISOString(),
    status: "بانتظار الرد",
  });

  // 2. إرسال إشعار واتساب فوري لموظف الاستقبال
  const notif =
    `🔔 *تحويل محادثة جديدة - يتطلب تدخل بشري*\n\n` +
    `📱 رقم العميل: ${store.normalizePhone(phone)}\n` +
    `📝 السبب: ${reason}\n` +
    `💬 آخر رسالة: ${lastMessage || "-"}\n\n` +
    `يرجى التواصل مع العميل مباشرة عبر واتساب.`;

  await sendMessage(RECEPTION_PHONE, notif);

  return handoffMessage();
}

// ===================== سير عمل الحجز =====================

async function startBooking(phone, conversation) {
  conversation.state = "booking_dept";
  conversation.data = {};
  store.saveConversation(phone, conversation);
  return departmentsListMessage();
}

async function handleBookingDept(phone, conversation, text) {
  let dept = findDeptByIndex(text) || findDeptByText(text);
  if (!dept) {
    return `⚠️ لم أتعرف على هذا القسم. ${departmentsListMessage()}`;
  }
  conversation.data.dept = dept.id;
  conversation.data.deptName = dept.name;
  conversation.state = "booking_doctor";
  store.saveConversation(phone, conversation);
  return doctorsListMessage(dept);
}

async function handleBookingDoctor(phone, conversation, text) {
  const dept = conversation.data.dept;
  let doctor = findDoctorByIndex(text, dept) || findDoctorByName(text);
  if (!doctor) {
    const deptObj = DEPARTMENTS.find((d) => d.id === dept);
    return `⚠️ لم أتعرف على الطبيب. ${doctorsListMessage(deptObj)}`;
  }
  conversation.data.doctorId = doctor.id;
  conversation.data.doctorName = doctor.name;
  conversation.data.fee = doctor.fee;
  conversation.state = "booking_date";
  store.saveConversation(phone, conversation);
  return (
    `✅ اختيارك: *${doctor.name}* (${doctor.title})\n\n` +
    `📅 من فضلك أدخل التاريخ المطلوب للموعد بصيغة:\n` +
    `*YYYY-MM-DD* (مثال: 2026-06-20)`
  );
}

async function handleBookingDate(phone, conversation, text) {
  const date = isValidDate(text);
  if (!date) {
    return `⚠️ صيغة التاريخ غير صحيحة. يرجى إدخال التاريخ بصيغة *YYYY-MM-DD* (مثال: 2026-06-20).`;
  }
  if (isPastDate(date)) {
    return `⚠️ لا يمكن الحجز في تاريخ سابق. يرجى إدخال تاريخ من اليوم فصاعداً.`;
  }
  conversation.data.date = date;
  conversation.state = "booking_time";
  store.saveConversation(phone, conversation);

  const taken = TIME_SLOTS.filter((t) =>
    store.isSlotTaken(conversation.data.doctorId, date, t)
  );

  if (taken.length === TIME_SLOTS.length) {
    conversation.state = "booking_date";
    store.saveConversation(phone, conversation);
    return `❌ عذراً، جميع الأوقات محجوزة لدى ${conversation.data.doctorName} في هذا التاريخ. يرجى اختيار تاريخ آخر.`;
  }

  return `📅 التاريخ: *${date}*\n\n${timeSlotsMessage(taken)}`;
}

async function handleBookingTime(phone, conversation, text) {
  const num = parseInt(text.trim(), 10);
  let time = null;
  if (!isNaN(num) && TIME_SLOTS[num - 1]) {
    time = TIME_SLOTS[num - 1];
  } else if (TIME_SLOTS.includes(text.trim())) {
    time = text.trim();
  }

  if (!time) {
    return `⚠️ يرجى اختيار رقم من الأوقات المتاحة.\n\n${timeSlotsMessage(
      TIME_SLOTS.filter((t) => store.isSlotTaken(conversation.data.doctorId, conversation.data.date, t))
    )}`;
  }

  // فحص التعارض
  if (store.isSlotTaken(conversation.data.doctorId, conversation.data.date, time)) {
    return `❌ عذراً، هذا الوقت محجوز للتو لدى الطبيب. يرجى اختيار وقت آخر.\n\n${timeSlotsMessage(
      TIME_SLOTS.filter((t) => store.isSlotTaken(conversation.data.doctorId, conversation.data.date, t))
    )}`;
  }

  conversation.data.time = time;
  conversation.state = "booking_name";
  store.saveConversation(phone, conversation);
  return `🕐 الوقت: *${time}*\n\n👤 يرجى إدخال *اسمك الكامل* (اسم المريض):`;
}

async function handleBookingName(phone, conversation, text) {
  const name = text.trim();
  if (name.length < 2) {
    return `⚠️ يرجى إدخال اسم صحيح.`;
  }
  conversation.data.name = name;

  // لجلسات الموقع (web-xxxx) نحتاج رقم هاتف فعلي للتواصل، أما واتساب فالرقم معروف من الجلسة
  if (String(phone).startsWith("web-")) {
    conversation.state = "booking_phone";
    store.saveConversation(phone, conversation);
    return `👤 الاسم: *${name}*\n\n📱 يرجى إدخال *رقم هاتفك* للتواصل (مثال: 05XXXXXXXX):`;
  }

  conversation.state = "booking_age";
  store.saveConversation(phone, conversation);
  return `👤 الاسم: *${name}*\n\n🎂 يرجى إدخال *العمر*:`;
}

async function handleBookingPhone(phone, conversation, text) {
  const raw = text.trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 7) {
    return `⚠️ يرجى إدخال رقم هاتف صحيح (مثال: 05XXXXXXXX).`;
  }
  conversation.data.contactPhone = raw;
  conversation.state = "booking_age";
  store.saveConversation(phone, conversation);
  return `📱 رقم الهاتف: *${raw}*\n\n🎂 يرجى إدخال *العمر*:`;
}

async function handleBookingAge(phone, conversation, text) {
  const age = parseInt(text.trim(), 10);
  if (isNaN(age) || age < 0 || age > 120) {
    return `⚠️ يرجى إدخال عمر صحيح (مثال: 35).`;
  }
  conversation.data.age = age;
  conversation.state = "booking_gender";
  store.saveConversation(phone, conversation);
  return `🎂 العمر: *${age}*\n\n⚧ يرجى تحديد *الجنس*:\n1. ذكر\n2. أنثى`;
}

async function handleBookingGender(phone, conversation, text) {
  const t = text.trim();
  let gender = null;
  if (t === "1" || t.includes("ذكر")) gender = "ذكر";
  else if (t === "2" || t.includes("أنث") || t.includes("انث")) gender = "أنثى";

  if (!gender) {
    return `⚠️ يرجى اختيار 1 (ذكر) أو 2 (أنثى).`;
  }
  conversation.data.gender = gender;
  conversation.state = "booking_reason";
  store.saveConversation(phone, conversation);
  return `⚧ الجنس: *${gender}*\n\n📝 يرجى كتابة *سبب الزيارة* باختصار (أو اكتب "بدون" للتخطي):`;
}

async function handleBookingReason(phone, conversation, text) {
  const reason = text.trim();
  conversation.data.reason = reason === "بدون" ? "" : reason;
  conversation.state = "booking_confirm";
  store.saveConversation(phone, conversation);

  const d = conversation.data;
  return (
    `📋 *مراجعة بيانات الحجز:*\n\n` +
    `🏥 القسم: ${d.deptName}\n` +
    `👨‍⚕️ الطبيب: ${d.doctorName}\n` +
    `📅 التاريخ: ${d.date}\n` +
    `🕐 الوقت: ${d.time}\n` +
    `👤 الاسم: ${d.name}\n` +
    (d.contactPhone ? `📱 الهاتف: ${d.contactPhone}\n` : "") +
    `🎂 العمر: ${d.age}\n` +
    `⚧ الجنس: ${d.gender}\n` +
    `📝 سبب الزيارة: ${d.reason || "-"}\n` +
    `💰 سعر الكشف: ${d.fee} د.إ\n\n` +
    `✅ اكتب "تأكيد" لتأكيد الحجز\n` +
    `❌ اكتب "إلغاء" للتراجع`
  );
}

async function handleBookingConfirm(phone, conversation, text) {
  const t = text.trim().toLowerCase();
  if (t.includes("إلغاء") || t.includes("الغاء") || t === "0") {
    conversation.state = "idle";
    conversation.data = {};
    store.saveConversation(phone, conversation);
    return `❌ تم إلغاء عملية الحجز. اكتب "القائمة" للبدء من جديد.`;
  }

  if (!t.includes("تأكيد") && !t.includes("نعم") && t !== "1") {
    return `يرجى كتابة "تأكيد" لإكمال الحجز أو "إلغاء" للتراجع.`;
  }

  const d = conversation.data;

  // فحص نهائي للتعارض قبل التأكيد
  if (store.isSlotTaken(d.doctorId, d.date, d.time)) {
    conversation.state = "booking_time";
    store.saveConversation(phone, conversation);
    return `❌ عذراً، تم حجز هذا الوقت من شخص آخر للتو. يرجى اختيار وقت آخر.\n\n${timeSlotsMessage(
      TIME_SLOTS.filter((time) => store.isSlotTaken(d.doctorId, d.date, time))
    )}`;
  }

  const isWeb = String(phone).startsWith("web-");
  const booking = {
    id: genBookingId(),
    deptId: d.dept,
    deptName: d.deptName,
    doctorId: d.doctorId,
    doctorName: d.doctorName,
    date: d.date,
    time: d.time,
    name: d.name,
    phone: isWeb ? store.normalizePhone(d.contactPhone || "") : store.normalizePhone(phone),
    age: d.age,
    gender: d.gender === "ذكر" ? "male" : "female",
    reason: d.reason,
    source: isWeb ? "إيجنت الموقع" : "إيجنت واتساب",
    status: "جديد",
    createdAt: new Date().toISOString(),
  };

  store.addBooking(booking);

  conversation.state = "idle";
  conversation.data = {};
  store.saveConversation(phone, conversation);

  return (
    `✅ *تم تأكيد حجزك بنجاح!*\n\n` +
    `🔖 رقم الحجز: *${booking.id}*\n` +
    `👨‍⚕️ الطبيب: ${booking.doctorName}\n` +
    `📅 التاريخ: ${booking.date}\n` +
    `🕐 الوقت: ${booking.time}\n\n` +
    `💡 احتفظ برقم الحجز لتعديله أو إلغائه لاحقاً.\n` +
    `للعودة للقائمة الرئيسية، اكتب "القائمة".`
  );
}

// ===================== تعديل / إلغاء الموعد =====================

async function startModifyCancel(phone, conversation, action) {
  const bookings = store.findBookingsByPhone(phone);
  if (bookings.length === 0) {
    return `لم أجد أي حجوزات مرتبطة برقمك. اكتب "القائمة" لعرض الخيارات.`;
  }

  conversation.state = action === "modify" ? "modify_select" : "cancel_select";
  conversation.data = { bookings: bookings.map((b) => b.id) };
  store.saveConversation(phone, conversation);

  let msg = `📋 *حجوزاتك الحالية:*\n\n`;
  bookings.forEach((b, i) => {
    msg += `${i + 1}. 🔖 ${b.id}\n   👨‍⚕️ ${b.doctorName} - ${b.deptName}\n   📅 ${b.date} 🕐 ${b.time}\n   الحالة: ${b.status}\n\n`;
  });
  msg += action === "modify" ? `اكتب رقم الحجز الذي تريد *تعديله*.` : `اكتب رقم الحجز الذي تريد *إلغاءه*.`;
  return msg;
}

async function handleCancelSelect(phone, conversation, text) {
  const num = parseInt(text.trim(), 10);
  const bookingIds = conversation.data.bookings;
  if (isNaN(num) || !bookingIds[num - 1]) {
    return `⚠️ يرجى إدخال رقم صحيح من القائمة أعلاه.`;
  }
  const bookingId = bookingIds[num - 1];
  const booking = store.getBookings().find((b) => b.id === bookingId);

  store.updateBooking(bookingId, { status: "ملغى" });

  conversation.state = "idle";
  conversation.data = {};
  store.saveConversation(phone, conversation);

  return (
    `✅ تم إلغاء الحجز *${bookingId}* بنجاح.\n` +
    `(${booking.doctorName} - ${booking.date} ${booking.time})\n\n` +
    `للعودة للقائمة الرئيسية، اكتب "القائمة".`
  );
}

async function handleModifySelect(phone, conversation, text) {
  const num = parseInt(text.trim(), 10);
  const bookingIds = conversation.data.bookings;
  if (isNaN(num) || !bookingIds[num - 1]) {
    return `⚠️ يرجى إدخال رقم صحيح من القائمة أعلاه.`;
  }
  const bookingId = bookingIds[num - 1];
  conversation.data.modifyBookingId = bookingId;
  conversation.state = "modify_date";
  store.saveConversation(phone, conversation);

  return `📅 يرجى إدخال *التاريخ الجديد* بصيغة YYYY-MM-DD (مثال: 2026-06-25):`;
}

async function handleModifyDate(phone, conversation, text) {
  const date = isValidDate(text);
  if (!date) {
    return `⚠️ صيغة التاريخ غير صحيحة. يرجى إدخال التاريخ بصيغة *YYYY-MM-DD*.`;
  }
  if (isPastDate(date)) {
    return `⚠️ لا يمكن الحجز في تاريخ سابق. يرجى إدخال تاريخ من اليوم فصاعداً.`;
  }
  conversation.data.newDate = date;
  conversation.state = "modify_time";
  store.saveConversation(phone, conversation);

  const bookingId = conversation.data.modifyBookingId;
  const booking = store.getBookings().find((b) => b.id === bookingId);
  const taken = TIME_SLOTS.filter((t) => store.isSlotTaken(booking.doctorId, date, t, bookingId));

  if (taken.length === TIME_SLOTS.length) {
    conversation.state = "modify_date";
    store.saveConversation(phone, conversation);
    return `❌ جميع الأوقات محجوزة في هذا التاريخ لدى ${booking.doctorName}. يرجى اختيار تاريخ آخر.`;
  }

  return `📅 التاريخ الجديد: *${date}*\n\n${timeSlotsMessage(taken)}`;
}

async function handleModifyTime(phone, conversation, text) {
  const num = parseInt(text.trim(), 10);
  let time = null;
  if (!isNaN(num) && TIME_SLOTS[num - 1]) time = TIME_SLOTS[num - 1];

  const bookingId = conversation.data.modifyBookingId;
  const booking = store.getBookings().find((b) => b.id === bookingId);
  const newDate = conversation.data.newDate;

  if (!time) {
    return `⚠️ يرجى اختيار رقم صحيح من الأوقات.\n\n${timeSlotsMessage(
      TIME_SLOTS.filter((t) => store.isSlotTaken(booking.doctorId, newDate, t, bookingId))
    )}`;
  }

  if (store.isSlotTaken(booking.doctorId, newDate, time, bookingId)) {
    return `❌ هذا الوقت محجوز. يرجى اختيار وقت آخر.\n\n${timeSlotsMessage(
      TIME_SLOTS.filter((t) => store.isSlotTaken(booking.doctorId, newDate, t, bookingId))
    )}`;
  }

  const oldDate = booking.date;
  const oldTime = booking.time;

  store.updateBooking(bookingId, { date: newDate, time, status: "جديد" });

  conversation.state = "idle";
  conversation.data = {};
  store.saveConversation(phone, conversation);

  return (
    `✅ تم تعديل الحجز *${bookingId}* بنجاح!\n\n` +
    `من: ${oldDate} ${oldTime}\n` +
    `إلى: *${newDate} ${time}*\n` +
    `👨‍⚕️ الطبيب: ${booking.doctorName}\n\n` +
    `للعودة للقائمة الرئيسية، اكتب "القائمة".`
  );
}

// ===================== التحقق من التوفر (بدون حجز) =====================

async function startAvailabilityCheck(phone, conversation) {
  conversation.state = "avail_dept";
  conversation.data = {};
  store.saveConversation(phone, conversation);
  return `🔍 *التحقق من توفر المواعيد*\n\n${departmentsListMessage()}`;
}

async function handleAvailDept(phone, conversation, text) {
  let dept = findDeptByIndex(text) || findDeptByText(text);
  if (!dept) {
    return `⚠️ لم أتعرف على هذا القسم. ${departmentsListMessage()}`;
  }
  conversation.data.dept = dept.id;
  conversation.state = "avail_doctor";
  store.saveConversation(phone, conversation);
  return doctorsListMessage(dept);
}

async function handleAvailDoctor(phone, conversation, text) {
  const dept = conversation.data.dept;
  let doctor = findDoctorByIndex(text, dept) || findDoctorByName(text);
  if (!doctor) {
    const deptObj = DEPARTMENTS.find((d) => d.id === dept);
    return `⚠️ لم أتعرف على الطبيب. ${doctorsListMessage(deptObj)}`;
  }
  conversation.data.doctorId = doctor.id;
  conversation.data.doctorName = doctor.name;
  conversation.state = "avail_date";
  store.saveConversation(phone, conversation);
  return `📅 أدخل التاريخ الذي تريد التحقق منه بصيغة *YYYY-MM-DD*:`;
}

async function handleAvailDate(phone, conversation, text) {
  const date = isValidDate(text);
  if (!date) {
    return `⚠️ صيغة التاريخ غير صحيحة. يرجى إدخال التاريخ بصيغة *YYYY-MM-DD*.`;
  }
  const taken = TIME_SLOTS.filter((t) => store.isSlotTaken(conversation.data.doctorId, date, t));
  const available = TIME_SLOTS.filter((t) => !taken.includes(t));

  conversation.state = "idle";
  conversation.data = {};
  store.saveConversation(phone, conversation);

  if (available.length === 0) {
    return `❌ لا توجد أوقات متاحة لدى ${conversation.data.doctorName || "الطبيب"} في ${date}.\n\nاكتب "القائمة" للعودة.`;
  }

  return (
    `✅ *الأوقات المتاحة في ${date}:*\n\n` +
    available.map((t) => `• ${t}`).join("\n") +
    `\n\nللحجز مباشرة، اكتب "حجز" أو "1".`
  );
}

// ===================== الموجه الرئيسي (Router) =====================

async function processMessage(phone, text) {
  const conversation = store.getConversation(phone);
  const t = text.trim();
  const tLower = t.toLowerCase();

  // حفظ آخر رسالة في السجل
  conversation.history = conversation.history || [];
  conversation.history.push({ from: "user", text: t, at: new Date().toISOString() });
  if (conversation.history.length > 50) conversation.history = conversation.history.slice(-50);

  // ----- إذا كانت المحادثة محوّلة لموظف، لا يرد الإيجنت تلقائياً -----
  if (conversation.handedOff) {
    if (tLower.includes("قائمة") || tLower.includes("القائمة") || tLower === "menu") {
      conversation.handedOff = false;
      conversation.state = "idle";
      store.saveConversation(phone, conversation);
      return welcomeMessage();
    }
    // لا رد تلقائي - الموظف هو من يرد
    return null;
  }

  // ----- أوامر عامة تعمل من أي حالة -----
  if (tLower.includes("القائمة") || tLower.includes("قائمة") || tLower === "menu" || t === "0") {
    conversation.state = "idle";
    conversation.data = {};
    store.saveConversation(phone, conversation);
    return welcomeMessage();
  }

  if (tLower.includes("موظف") || tLower.includes("استقبال") || tLower.includes("بشري") || tLower.includes("تحويل")) {
    return await handoffToReception(phone, conversation, "طلب العميل التحدث مع موظف الاستقبال", t);
  }

  // ----- بدء محادثة جديدة (تحية أو رسالة أولى) -----
  const greetings = ["السلام", "سلام", "هلا", "مرحبا", "مرحباً", "hi", "hello", "السلام عليكم"];
  if (conversation.state === "idle" && (greetings.some((g) => tLower.includes(g)) || conversation.history.length <= 1)) {
    if (!greetings.some((g) => tLower.includes(g)) && conversation.history.length <= 1 && /^[1-7]$/.test(t)) {
      // المستخدم بدأ مباشرة برقم - تعامل معه كاختيار من القائمة
    } else if (conversation.history.length <= 1) {
      conversation.state = "idle";
      store.saveConversation(phone, conversation);
      return welcomeMessage();
    }
  }

  // ----- التوجيه حسب الحالة الحالية -----
  switch (conversation.state) {
    case "booking_dept":
      return await handleBookingDept(phone, conversation, t);
    case "booking_doctor":
      return await handleBookingDoctor(phone, conversation, t);
    case "booking_date":
      return await handleBookingDate(phone, conversation, t);
    case "booking_time":
      return await handleBookingTime(phone, conversation, t);
    case "booking_name":
      return await handleBookingName(phone, conversation, t);
    case "booking_phone":
      return await handleBookingPhone(phone, conversation, t);
    case "booking_age":
      return await handleBookingAge(phone, conversation, t);
    case "booking_gender":
      return await handleBookingGender(phone, conversation, t);
    case "booking_reason":
      return await handleBookingReason(phone, conversation, t);
    case "booking_confirm":
      return await handleBookingConfirm(phone, conversation, t);

    case "cancel_select":
      return await handleCancelSelect(phone, conversation, t);

    case "modify_select":
      return await handleModifySelect(phone, conversation, t);
    case "modify_date":
      return await handleModifyDate(phone, conversation, t);
    case "modify_time":
      return await handleModifyTime(phone, conversation, t);

    case "avail_dept":
      return await handleAvailDept(phone, conversation, t);
    case "avail_doctor":
      return await handleAvailDoctor(phone, conversation, t);
    case "avail_date":
      return await handleAvailDate(phone, conversation, t);

    case "idle":
    default:
      return await handleIdleState(phone, conversation, t, tLower);
  }
}

// ===================== معالجة الحالة الخالية (idle) - فهم النوايا =====================

async function handleIdleState(phone, conversation, t, tLower) {
  // 1. حجز موعد
  if (
    t === "1" ||
    tLower.includes("حجز") ||
    tLower.includes("احجز") ||
    tLower.includes("موعد جديد") ||
    tLower.includes("اريد موعد") ||
    tLower.includes("أريد موعد")
  ) {
    return await startBooking(phone, conversation);
  }

  // 2. الأقسام والأطباء
  if (
    t === "2" ||
    tLower.includes("اقسام") ||
    tLower.includes("أقسام") ||
    tLower.includes("اطباء") ||
    tLower.includes("أطباء") ||
    tLower.includes("تخصص")
  ) {
    return departmentsListMessage();
  }

  // 3. مواعيد العمل
  if (t === "3" || tLower.includes("مواعيد العمل") || tLower.includes("ساعات العمل") || tLower.includes("متى تفتح") || tLower.includes("دوام")) {
    return workingHoursMessage();
  }

  // 4. العنوان والموقع
  if (
    t === "4" ||
    tLower.includes("عنوان") ||
    tLower.includes("موقع") ||
    tLower.includes("وين") ||
    tLower.includes("فين") ||
    tLower.includes("اين") ||
    tLower.includes("أين")
  ) {
    const msg = locationMessage();
    // إرسال الموقع الجغرافي بعد رسالة العنوان
    setTimeout(() => {
      sendLocation(phone, 25.2117, 55.2789, HOSPITAL_INFO.name + " - " + HOSPITAL_INFO.address);
    }, 1500);
    return msg;
  }

  // 5. تعديل موعد
  if (t === "5" || tLower.includes("تعديل") || tLower.includes("تغيير الموعد") || tLower.includes("غير الموعد") || tLower.includes("اعادة جدولة") || tLower.includes("إعادة جدولة")) {
    return await startModifyCancel(phone, conversation, "modify");
  }

  // 6. إلغاء موعد
  if (t === "6" || tLower.includes("الغاء") || tLower.includes("إلغاء") || tLower.includes("الغ") || tLower.includes("كنسل") || tLower.includes("cancel")) {
    return await startModifyCancel(phone, conversation, "cancel");
  }

  // 7. التحويل لموظف (تمت معالجته أعلاه أيضاً لكن نتركه هنا للأمان)
  if (t === "7") {
    return await handoffToReception(phone, conversation, "طلب العميل التحدث مع موظف الاستقبال", t);
  }

  // التحقق من التوفر
  if (tLower.includes("متاح") || tLower.includes("توفر") || tLower.includes("فاضي") || tLower.includes("فراغ")) {
    return await startAvailabilityCheck(phone, conversation);
  }

  // الاستفسار عن سعر الكشف لطبيب معين
  const doctorMatch = findDoctorByName(t);
  if (doctorMatch && (tLower.includes("سعر") || tLower.includes("كشف") || tLower.includes("تكلفة"))) {
    return `💰 سعر الكشف لدى ${doctorMatch.name} (${doctorMatch.title}): *${doctorMatch.fee} د.إ*\n⏱ مدة الموعد: ${doctorMatch.duration} دقيقة\n\nللحجز اكتب "حجز" أو "1".`;
  }

  // الاستفسار عن قسم معين مباشرة
  const deptMatch = findDeptByText(t);
  if (deptMatch) {
    return doctorsListMessage(deptMatch);
  }

  // إذا لم يفهم الإيجنت الطلب نهائياً - تحويل لموظف
  if (conversation.unresolvedCount === undefined) conversation.unresolvedCount = 0;
  conversation.unresolvedCount += 1;
  store.saveConversation(phone, conversation);

  if (conversation.unresolvedCount >= 2) {
    conversation.unresolvedCount = 0;
    store.saveConversation(phone, conversation);
    return await handoffToReception(phone, conversation, "لم يتمكن الإيجنت من فهم طلب العميل بعد محاولتين", t);
  }

  return genericErrorMessage();
}

module.exports = { processMessage, welcomeMessage };
