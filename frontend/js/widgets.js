// import { api } from "./api.js";
// import { connectWS } from "./ws.js";

// export function initWidgets() {
//   if (!api.isLoggedIn()) return; // чат и уведомления только для авторизованных

//   injectMarkup();
//   initNotifications();
//   initChat();
// }

// function injectMarkup() {
//   const el = document.createElement("div");
//   el.innerHTML = `
//     <div class="notif-toast-stack" id="notifStack"></div>

//     <button class="fab fab-chat" id="chatFab" aria-label="Чат поддержки">
//       💬
//       <span class="fab-dot" id="chatDot"></span>
//     </button>

//     <div class="chat-panel" id="chatPanel">
//       <div class="chat-panel-header">
//         <span>Поддержка Ярмарки</span>
//         <button id="chatClose" aria-label="Закрыть">✕</button>
//       </div>
//       <div class="chat-panel-body" id="chatBody">
//         <div class="state-msg">Загружаем историю…</div>
//       </div>
//       <form class="chat-panel-input" id="chatForm">
//         <input type="text" id="chatInput" placeholder="Напишите сообщение…" autocomplete="off">
//         <button type="submit">→</button>
//       </form>
//     </div>
//   `;
//   document.body.appendChild(el);
// }

// // ---------------- Уведомления ----------------
// function initNotifications() {
//   connectWS(
//     () => api.wsUrl("/notifications/"),
//     (msg) => showToast(msg),
//   );
// }

// function showToast(msg) {
//   const stack = document.getElementById("notifStack");
//   const toast = document.createElement("div");
//   toast.className = "notif-toast";
//   toast.innerHTML = `
//     <div class="notif-toast-title">${msg.title || "Обновление заказа"}</div>
//     <div class="notif-toast-text">${msg.text || msg.status || ""}</div>
//   `;
//   stack.appendChild(toast);
//   requestAnimationFrame(() => toast.classList.add("show"));
//   setTimeout(() => {
//     toast.classList.remove("show");
//     setTimeout(() => toast.remove(), 400);
//   }, 5000);
// }

// // ---------------- Чат ----------------
// function initChat() {
//   const fab = document.getElementById("chatFab");
//   const panel = document.getElementById("chatPanel");
//   const body = document.getElementById("chatBody");
//   const form = document.getElementById("chatForm");
//   const input = document.getElementById("chatInput");
//   const dot = document.getElementById("chatDot");

//   let opened = false;
//   let historyLoaded = false;
//   let ws = null;

//   fab.addEventListener("click", async () => {
//     opened = !opened;
//     panel.classList.toggle("open", opened);
//     if (opened && !historyLoaded) {
//       historyLoaded = true;
//       await loadHistory();
//       ws = connectWS(
//         () => api.wsUrl("/chat/"),
//         (msg) => appendMessage(msg),
//       );
//     }
//     if (opened) dot.classList.remove("show");
//   });

//   document.getElementById("chatClose").addEventListener("click", () => {
//     opened = false;
//     panel.classList.remove("open");
//   });

//   form.addEventListener("submit", (e) => {
//     e.preventDefault();
//     const text = input.value.trim();
//     if (!text || !ws) return;
//     ws.send({ text });
//     appendMessage({ text, is_mine: true });
//     input.value = "";
//   });

//   async function loadHistory() {
//     try {
//       const history = await api.getChatHistory();
//       body.innerHTML = "";
//       const items = Array.isArray(history) ? history : history.results || [];
//       if (!items.length) {
//         body.innerHTML =
//           '<div class="state-msg">Напишите нам, если что-то понадобится 👋</div>';
//       } else {
//         items.forEach(appendMessage);
//       }
//     } catch (err) {
//       body.innerHTML =
//         '<div class="state-msg error">Не удалось загрузить историю чата</div>';
//     }
//   }

//   function appendMessage(msg) {
//     if (body.querySelector(".state-msg")) body.innerHTML = "";
//     const bubble = document.createElement("div");
//     bubble.className = `chat-bubble ${msg.is_mine ? "mine" : "theirs"}`;
//     bubble.textContent = msg.text;
//     body.appendChild(bubble);
//     body.scrollTop = body.scrollHeight;
//     if (!opened && !msg.is_mine) dot.classList.add("show");
//   }
// }

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
function initChat() {
  const fab = document.getElementById("chatFab");
  const panel = document.getElementById("chatPanel");
  const body = document.getElementById("chatBody");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const dot = document.getElementById("chatDot");

  let opened = false;
  let historyLoaded = false;
  let ws = null;

  fab.addEventListener("click", async () => {
    opened = !opened;
    panel.classList.toggle("open", opened);

    if (opened && !historyLoaded) {
      historyLoaded = true;
      const roomName = await loadHistory();

      if (roomName) {
        ws = connectWS(
          () => api.wsUrl(`/chat/${roomName}/`),
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
    appendMessage({ text, is_mine: true });
    input.value = "";
  });

  // Возвращает имя/id комнаты, которое подставляется в URL WebSocket
  // (ws/chat/<room_name>/). Сама история сообщений тоже рисуется здесь.
  //
  // ВАЖНО: не знаю точную структуру ответа GET /api/chat/rooms/ —
  // ниже разумное предположение с проверкой нескольких вариантов
  // названия поля. Если ни одно не подходит, посмотри реальный JSON
  // в Network → chat/rooms/ и поправь функцию getRoomName().
  async function loadHistory() {
    try {
      const history = await api.getChatHistory();
      const items = Array.isArray(history) ? history : history.results || [];

      body.innerHTML = "";
      if (!items.length) {
        body.innerHTML =
          '<div class="state-msg">Напишите нам, если что-то понадобится 👋</div>';
      } else {
        items.forEach(appendMessage);
      }

      return getRoomName(history, items);
    } catch (err) {
      body.innerHTML =
        '<div class="state-msg error">Не удалось загрузить историю чата</div>';
      return null;
    }
  }

  function getRoomName(history, items) {
    // Вариант 1: сервер сразу отдаёт объект комнаты, а не список сообщений
    if (history && !Array.isArray(history)) {
      if (history.room_name) return history.room_name;
      if (history.room) return history.room;
      if (history.id !== undefined) return history.id;
      if (history.name) return history.name;
    }
    // Вариант 2: сервер отдаёт список комнат, берём первую (комната поддержки)
    if (items && items.length) {
      const first = items[0];
      if (first.room_name) return first.room_name;
      if (first.room) return first.room;
      if (first.id !== undefined) return first.id;
      if (first.name) return first.name;
    }
    return null;
  }

  function appendMessage(msg) {
    if (body.querySelector(".state-msg")) body.innerHTML = "";
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${msg.is_mine ? "mine" : "theirs"}`;
    bubble.textContent = msg.text;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
    if (!opened && !msg.is_mine) dot.classList.add("show");
  }
}
