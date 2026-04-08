(function () {
  function isTelegramInApp() {
    var ua = navigator.userAgent || "";
    // Telegram iOS/Android webview обычно содержит "Telegram" в UA
    // + на Android часто есть объект TelegramWebviewProxy
    return /Telegram/i.test(ua) || typeof window.TelegramWebviewProxy !== "undefined";
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || "");
  }
  function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  function makeBanner() {
    var bar = document.createElement("div");
    bar.id = "tg-open-in-browser-bar";
    bar.innerHTML =
      '<div class="tg-open-in-browser-inner">' +
      '<div class="tg-open-in-browser-text">' +
      'Открывается внутри Telegram. Для лучшей работы откройте сайт в браузере.' +
      '</div>' +
      '<button type="button" class="tg-open-in-browser-btn">Открыть в браузере</button>' +
      '</div>';
    document.body.appendChild(bar);

    bar.querySelector("button").addEventListener("click", function () {
      openExternally();
    });
  }

  function openExternally() {
    var url = window.location.href;

    // Попытка для Android через intent:// (обычно выкидывает в внешний браузер/выбор)
    if (isAndroid()) {
      try {
        var u = new URL(url);
        var intentUrl =
          "intent://" + u.host + u.pathname + u.search + u.hash +
          "#Intent;scheme=" + u.protocol.replace(":", "") + ";end";
        window.location.href = intentUrl;
        return;
      } catch (e) {}
    }

    // Фолбэк: попытка открыть новую вкладку (на некоторых устройствах Telegram покажет "Открыть")
    try {
      var a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {}

    // Если ничего не сработало — оставляем пользователю подсказку в баннере
  }

  function injectStyles() {
    var css = document.createElement("style");
    css.textContent = [
      "#tg-open-in-browser-bar{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(10,10,10,.92);color:#fff;}",
      "#tg-open-in-browser-bar .tg-open-in-browser-inner{max-width:1100px;margin:0 auto;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 14px;}",
      "#tg-open-in-browser-bar .tg-open-in-browser-text{font-size:14px;line-height:1.3;opacity:.95;}",
      "#tg-open-in-browser-bar .tg-open-in-browser-btn{background:#fff;color:#111;border:0;border-radius:10px;padding:10px 12px;font-weight:600;cursor:pointer;}",
      "@media (max-width:520px){#tg-open-in-browser-bar .tg-open-in-browser-inner{flex-direction:column;align-items:stretch;}#tg-open-in-browser-bar .tg-open-in-browser-btn{width:100%;}}"
    ].join("");
    document.head.appendChild(css);
  }

  if (!isTelegramInApp()) return;

  // Показываем баннер и делаем одну "мягкую" авто-попытку (без бесконечных редиректов)
  injectStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", makeBanner);
  } else {
    makeBanner();
  }

  try {
    if (!sessionStorage.getItem("tg_external_attempted")) {
      sessionStorage.setItem("tg_external_attempted", "1");
      // Небольшая задержка чтобы успел отрисоваться баннер
      setTimeout(openExternally, 600);
    }
  } catch (e) {}
})();