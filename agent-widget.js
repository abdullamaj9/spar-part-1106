// ===================== ويدجت المساعد الذكي - مستشفى الموسي التخصصي =====================
// يتصل بسيرفر الإيجنت على Render عبر /api/chat

const AGENT_API_BASE = "https://hospital1-d85j.onrender.com"; // عدّل هذا الرابط إذا تغير رابط سيرفر Render

(function () {
  // ---------- توليد / استرجاع معرف الجلسة ----------
  function getSessionId() {
    let id = sessionStorage.getItem("almousa_chat_session");
    if (!id) {
      id = "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem("almousa_chat_session", id);
    }
    return id;
  }

  // ---------- بناء عناصر الويدجت ----------
  function buildWidget() {
    const wrap = document.createElement("div");
    wrap.id = "agentChatWidget";
    wrap.innerHTML = `
      <button id="agentChatToggle" aria-label="فتح المساعد الذكي">
        <span class="agent-chat-icon-open">🩺</span>
        <span class="agent-chat-icon-close">✕</span>
      </button>
      <div id="agentChatWindow" class="agent-chat-window" role="dialog" aria-label="المساعد الذكي لمستشفى الموسي">
        <div class="agent-chat-header">
          <div class="agent-chat-header-info">
            <span class="agent-chat-avatar">✚</span>
            <div>
              <strong>المساعد الذكي</strong>
              <span class="agent-chat-status">متصل الآن</span>
            </div>
          </div>
          <button id="agentChatClose" aria-label="إغلاق المحادثة">✕</button>
        </div>
        <div id="agentChatMessages" class="agent-chat-messages"></div>
        <div id="agentChatTyping" class="agent-chat-typing" style="display:none;">
          <span></span><span></span><span></span>
        </div>
        <form id="agentChatForm" class="agent-chat-form">
          <input type="text" id="agentChatInput" placeholder="اكتب رسالتك هنا..." autocomplete="off" />
          <button type="submit" aria-label="إرسال">➤</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  // ---------- إضافة رسالة للواجهة ----------
  function appendMessage(text, sender) {
    const messages = document.getElementById("agentChatMessages");
    const bubble = document.createElement("div");
    bubble.className = `agent-msg agent-msg-${sender}`;
    // تحويل **bold** و أسطر جديدة إلى HTML بسيط وآمن
    bubble.innerHTML = formatMessage(text);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function formatMessage(text) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function setTyping(show) {
    document.getElementById("agentChatTyping").style.display = show ? "flex" : "none";
    const messages = document.getElementById("agentChatMessages");
    messages.scrollTop = messages.scrollHeight;
  }

  // ---------- إرسال رسالة للسيرفر ----------
  async function sendToAgent(message) {
    const sessionId = getSessionId();
    try {
      const res = await fetch(`${AGENT_API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      return data.reply || "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.";
    } catch (err) {
      console.error("خطأ في الاتصال بالمساعد الذكي:", err);
      return "⚠️ تعذر الاتصال بالمساعد الذكي حالياً. يرجى المحاولة لاحقاً أو التواصل عبر واتساب على 0566350025.";
    }
  }

  async function fetchWelcome() {
    try {
      const res = await fetch(`${AGENT_API_BASE}/api/chat/welcome`);
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      return data.reply;
    } catch {
      return "🏥 *مرحباً بك في مستشفى الموسي التخصصي* ✚\n\nاكتب رسالتك وسأساعدك في الحجز أو الاستفسار.";
    }
  }

  // ---------- تهيئة الويدجت ----------
  function init() {
    buildWidget();

    const toggleBtn = document.getElementById("agentChatToggle");
    const closeBtn = document.getElementById("agentChatClose");
    const windowEl = document.getElementById("agentChatWindow");
    const form = document.getElementById("agentChatForm");
    const input = document.getElementById("agentChatInput");

    let opened = false;
    let welcomed = false;

    async function openChat() {
      windowEl.classList.add("open");
      toggleBtn.classList.add("open");
      opened = true;
      if (!welcomed) {
        welcomed = true;
        setTyping(true);
        const welcome = await fetchWelcome();
        setTyping(false);
        appendMessage(welcome, "bot");
      }
      input.focus();
    }

    function closeChat() {
      windowEl.classList.remove("open");
      toggleBtn.classList.remove("open");
      opened = false;
    }

    toggleBtn.addEventListener("click", () => {
      if (opened) closeChat();
      else openChat();
    });
    closeBtn.addEventListener("click", closeChat);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      appendMessage(text, "user");
      input.value = "";
      input.disabled = true;
      setTyping(true);

      const reply = await sendToAgent(text);

      setTyping(false);
      appendMessage(reply, "bot");
      input.disabled = false;
      input.focus();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
