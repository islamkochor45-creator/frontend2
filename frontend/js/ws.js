// ws.js — обёртка над WebSocket с автопереподключением
// wsUrlFn — функция, возвращающая полный ws:// адрес с токеном (api.wsUrl(path))

export function connectWS(wsUrlFn, onMessage, { onOpen, onClose } = {}) {
  let socket = null;
  let retryDelay = 1000;
  let closedByUser = false;

  function open() {
    socket = new WebSocket(wsUrlFn());

    socket.addEventListener('open', () => {
      retryDelay = 1000;
      if (onOpen) onOpen();
    });

    socket.addEventListener('message', (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch (_) {
        onMessage(event.data);
      }
    });

    socket.addEventListener('close', () => {
      if (onClose) onClose();
      if (!closedByUser) {
        setTimeout(open, retryDelay);
        retryDelay = Math.min(retryDelay * 1.6, 15000);
      }
    });

    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  open();

  return {
    send(data) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
      }
    },
    close() {
      closedByUser = true;
      if (socket) socket.close();
    },
  };
}
