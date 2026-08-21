import { api } from "./api.js";
import { connectWS } from "./ws.js";

export function initWidgets() {
  if (!api.isLoggedIn()) return; // чат и уведомления только для авторизованных

  injectMarkup();
  initNotifications();
  initChat();
}

function injectMarkup() {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="notif-toast-stack" id="notifStack"></div>

    <button class="fab fab-chat" id="chatFab" aria-label="Чат поддержки">
      💬
      <span class="fab-dot" id="chatDot"></span>
    </button>

    <div class="chat-panel" id="chatPanel">
      <div class="chat-panel-header">
        <span>Поддержка Ярмарки</span>
        <button id="chatClose" aria-label="Закрыть">✕</button>
      </div>
      <div class="chat-panel-body" id="chatBody">
        <div class="state-msg">Загружаем историю…</div>
      </div>
      <form class="chat-panel-input" id="chatForm">
        <input type="text" id="chatInput" placeholder="Напишите сообщение…" autocomplete="off">
        <button type="submit">→</button>
      </form>
    </div>
  `;
  document.body.appendChild(el);
}

// ---------------- Уведомления ----------------
function initNotifications() {
  connectWS(
    () => api.wsUrl("/notifications/"),
    (msg) => showToast(msg),
  );
}

function showToast(msg) {
  const stack = document.getElementById("notifStack");
  const toast = document.createElement("div");
  toast.className = "notif-toast";
  toast.innerHTML = `
    <div class="notif-toast-title">${msg.title || "Обновление заказа"}</div>
    <div class="notif-toast-text">${msg.text || msg.status || ""}</div>
  `;
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// ---------------- Чат ----------------
async function initChat() {
  const fab = document.getElementById("chatFab");
  const panel = document.getElementById("chatPanel");
  const body = document.getElementById("chatBody");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const dot = document.getElementById("chatDot");

  let opened = false;
  let historyLoaded = false;
  let ws = null;

  // Ждём email текущего юзера ДО того, как что-либо рендерится —
  // иначе появляется гонка: история успевает отрисоваться, пока
  // currentUserEmail ещё null, и всё выглядит как "чужие" сообщения.
  let currentUserEmail = null;
  try {
    const me = await api.me();
    currentUserEmail = me.email;
    // currentUserRole = me.role;
  } catch (_) {
    // не критично — просто все сообщения будут выглядеть как чужие
  }

  fab.addEventListener("click", async () => {
    opened = !opened;
    panel.classList.toggle("open", opened);

    if (opened && !historyLoaded) {
      historyLoaded = true;
      const roomId = await openRoomAndLoadMessages();

      if (roomId) {
        ws = connectWS(
          () => api.wsUrl(`/chat/${roomId}/`),
          (msg) => appendMessage(msg),
        );
      } else {
        body.innerHTML =
          '<div class="state-msg error">Не удалось открыть чат — комната не найдена</div>';
      }
    }

    if (opened) dot.classList.remove("show");
  });

  document.getElementById("chatClose").addEventListener("click", () => {
    opened = false;
    panel.classList.remove("open");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !ws) return;
    ws.send({ text });
    input.value = "";
    // Своё сообщение не рисуем локально — оно вернётся через WebSocket
    // (сервер рассылает всем участникам группы, включая отправителя).
  });

  async function openRoomAndLoadMessages() {
    try {
      const rooms = await api.getChatRooms();
      const roomList = Array.isArray(rooms) ? rooms : rooms.results || [];

      if (!roomList.length) {
        body.innerHTML =
          '<div class="state-msg error">Комната не найдена</div>';
        return null;
      }

      const room = roomList[0];
      const roomId = room.id;

      const messages = await api.getRoomMessages(roomId);
      const messageList = Array.isArray(messages)
        ? messages
        : messages.results || [];

      body.innerHTML = "";
      if (!messageList.length) {
        body.innerHTML =
          '<div class="state-msg">Напишите нам, если что-то понадобится 👋</div>';
      } else {
        messageList.forEach(appendMessage);
      }

      return roomId;
    } catch (err) {
      body.innerHTML =
        '<div class="state-msg error">Не удалось загрузить историю чата</div>';
      return null;
    }
  }

  function getSenderEmail(msg) {
    // REST-история отдаёт "user_email", WebSocket-эхо от ChatConsumer
    // отдаёт email в поле "user" — приводим к одному варианту здесь,
    // не полагаясь на то, что бэкенд всегда шлёт одинаковое имя поля.
    return msg.user_email || msg.user || "";
  }

  function appendMessage(msg) {
    if (body.querySelector(".state-msg")) body.innerHTML = "";

    const senderEmail = getSenderEmail(msg);
    const senderRole = msg.user_role || msg.role || "";
    const isMine = currentUserEmail && senderEmail === currentUserEmail;
    // senderRole === currentUserRole;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMine ? "mine" : "theirs"}`;

    if (!isMine && senderEmail) {
      const name = document.createElement("div");
      name.className = "chat-bubble-sender";
      name.textContent = senderEmail;
      // name.textContent = senderRole;
      bubble.appendChild(name);
    }

    const textEl = document.createElement("div");
    textEl.textContent = msg.text;
    bubble.appendChild(textEl);

    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
    if (!opened && !isMine) dot.classList.add("show");
  }
}
