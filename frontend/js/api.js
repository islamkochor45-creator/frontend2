// ==========================================================================
// api.js — единая точка входа для всех запросов к Django REST Framework backend
//
// ВАЖНО: имена полей и точные пути эндпоинтов ниже взяты из ТЗ (backend-spec.md).
// Если в реальном коде backend названия полей сериализаторов отличаются —
// поправь их именно здесь, один раз, а не в каждой странице отдельно.
// ==========================================================================

const API_BASE = "http://localhost:8000/api";
const WS_BASE = "ws://localhost:8000/ws";

// -------------------- Хранение токенов --------------------
const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}
function setTokens(access, refresh) {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}
function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
function isLoggedIn() {
  return !!getAccessToken();
}

// Эндпоинты, где 401 значит "неверный логин/пароль", а НЕ "токен протух".
// Для них нельзя запускать авто-refresh — иначе старый refresh-токен из
// localStorage (например, от предыдущей сессии другого пользователя)
// тихо "чинит" запрос и маскирует настоящую причину 401.
function isAuthEndpoint(path) {
  return path.startsWith("/auth/login") || path.startsWith("/auth/register");
}

// -------------------- Низкоуровневый fetch с авто-refresh --------------------
async function request(path, options = {}, retry = true) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    // backend недоступен (не запущен / CORS / нет сети)
    throw {
      networkError: true,
      message:
        "Не удалось связаться с сервером. Backend запущен на localhost:8000?",
    };
  }

  // access-токен протух — пробуем обновить и повторить запрос один раз.
  // Не делаем этого для /auth/login/ и /auth/register/ — там 401 означает
  // неверные данные при входе, а не протухший токен.
  if (
    res.status === 401 &&
    retry &&
    !isAuthEndpoint(path) &&
    getRefreshToken()
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, options, false);
    }
    clearTokens();
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = text;
    }
  }

  if (!res.ok) {
    throw { status: res.status, data, message: extractErrorMessage(data) };
  }
  return data;
}

function extractErrorMessage(data) {
  if (!data) return "Что-то пошло не так";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  // DRF обычно возвращает { field: ["ошибка"] }
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) return data[firstKey][0];
  return "Что-то пошло не так";
}

async function refreshAccessToken() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: getRefreshToken() }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return true;
  } catch (_) {
    return false;
  }
}

// -------------------- Публичный API --------------------
export const api = {
  isLoggedIn,
  clearTokens,

  // --- Аутентификация ---
  register(payload) {
    // payload: { email, password, password2 (или confirm), ... }
    return request("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async login(payload) {
    // payload: { email, password }
    // На всякий случай чистим токены от предыдущей сессии перед новой
    // попыткой входа — иначе чужой refresh-токен может тихо "подмешаться"
    // в логику авто-refresh при следующих запросах.
    clearTokens();
    const data = await request("/auth/login/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setTokens(data.access, data.refresh);
    return data;
  },
  async logout() {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await request("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh }),
        });
      }
    } finally {
      clearTokens();
    }
  },
  me() {
    return request("/auth/me/");
  },

  // --- Каталог ---
  getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/catalog/products/${qs ? `?${qs}` : ""}`);
  },
  getProduct(id) {
    return request(`/catalog/products/${id}/`);
  },

  // --- Корзина ---
  getCart() {
    return request("/cart/");
  },
  addCartItem(productId, quantity = 1) {
    return request("/cart/items/", {
      method: "POST",
      body: JSON.stringify({ product: productId, quantity }),
    });
  },
  updateCartItem(itemId, quantity) {
    return request(`/cart/items/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },
  removeCartItem(itemId) {
    return request(`/cart/items/${itemId}/`, { method: "DELETE" });
  },

  // --- Заказы ---
  createOrder(payload) {
    return request("/orders/checkout/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getOrders() {
    return request("/orders/");
  },
  getOrder(id) {
    return request(`/orders/${id}/`);
  },
  cancelOrder(id) {
    return request(`/orders/${id}/`, { method: "DELETE" });
  },

  // --- Адреса доставки ---
  createAddress(payload) {
    return request("/orders/addresses/", {
      method: "POST",
      // heders: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  getAddresses() {
    return request("/orders/addresses/");
  },

  // --- Оплата (mock) ---
  createPayment(payload) {
    return request("/payments/create/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- Избранное ---
  getWishlist() {
    return request("/catalog/favorites/");
  },
  addWishlist(productId) {
    return request("/catalog/favorites/add/", {
      method: "POST",
      body: JSON.stringify({ product: productId }),
    });
  },
  removeWishlist(entryId) {
    return request(`/catalog/favorites/${entryId}/`, { method: "DELETE" });
  },

  // --- Отзывы ---
  getReviews(productId) {
    return request(`/reviews/`);
  },
  createReview(productId, payload) {
    return request(`/reviews/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- Кабинет продавца ---
  getMyProducts() {
    return request("/catalog/products/");
  },
  createProduct(payload) {
    return request("/catalog/products/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateProduct(id, payload) {
    return request(`/catalog/products/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  getSellerOrders() {
    return request("/catalog/sellers/");
  },
  getSellerStats() {
    return request("/catalog/sellers/");
  },

  // --- Уведомления ---
  getNotifications() {
    return request("/notifications/");
  },

  // --- Чат ---
  getChatRooms() {
    return request("/chat/rooms/");
  },
  getRoomMessages(roomId) {
    return request(`/chat/rooms/${roomId}/messages/`);
  },
  sendRoomMessage(roomId, text) {
    return request(`/chat/rooms/${roomId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  wsUrl(path) {
    return `${WS_BASE}${path}?token=${getAccessToken() || ""}`;
  },
};
