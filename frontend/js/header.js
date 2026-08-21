import { api } from './api.js';

// Инициализирует шапку: показывает логин/логаут, обновляет счётчик корзины.
// Вызывать на каждой странице после загрузки DOM.
export async function initHeader() {
  const userSlot = document.getElementById('userSlot');
  const cartBadge = document.getElementById('cartBadge');

  if (!userSlot) return;

  if (api.isLoggedIn()) {
    try {
      const me = await api.me();
      userSlot.innerHTML = `
        <div class="user-chip">
          ${me.email || me.username || 'Профиль'}
          <button id="logoutBtn">Выйти</button>
        </div>
      `;
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        await api.logout();
        window.location.href = 'index.html';
      });
    } catch (err) {
      // токен невалиден — считаем разлогиненным
      api.clearTokens();
      renderLoggedOut(userSlot);
    }

    try {
      const cart = await api.getCart();
      const count = (cart.items || []).reduce((sum, i) => sum + i.quantity, 0);
      if (cartBadge) cartBadge.textContent = count;
    } catch (_) {
      if (cartBadge) cartBadge.textContent = '0';
    }
  } else {
    renderLoggedOut(userSlot);
    if (cartBadge) cartBadge.textContent = '0';
  }
}

function renderLoggedOut(userSlot) {
  userSlot.innerHTML = `<a href="login.html" class="btn-ghost" style="padding:8px 16px; font-size:13px;">Войти</a>`;
}
