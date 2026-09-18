// Исполняется в КОНТЕКСТЕ СТРАНИЦЫ - только отсюда видно window.jQuery.
// chrome.* здесь недоступен: правил не знает, фильтрацией не занимается,
// просто шлёт наружу каждый перехваченный URL.
//
// Главное требование: перехват ничего не меняет и не останавливает.
(function () {
  'use strict';

  var ns = window.__jqueryUrlInspector || {};
  var log = ns.log;
  var messages = ns.messages;
  var urlUtils = ns.url;

  // Без shared-модулей работать нечем - они инжектятся первыми, но если
  // что-то пошло не так, молча выходим, не трогая страницу.
  if (!log || !messages || !urlUtils) {
    console.warn('[jquery-url-inspector] shared-модули не загрузились, перехват отключён');
    return;
  }

  // jQuery может появиться позже нас: content script работает на document_start.
  var POLL_INTERVAL_MS = 50;
  var POLL_TIMEOUT_MS = 20000;

  // Защита от повторного инжекта в одну и ту же страницу.
  if (ns.__interceptorInstalled) return;
  ns.__interceptorInstalled = true;

  // postMessage на самого себя. targetOrigin 'null' невалиден (file://, песочница),
  // в этом случае отправляем без ограничения - получателем всё равно будет
  // только это окно.
  function targetOrigin() {
    return location.origin && location.origin !== 'null' ? location.origin : '*';
  }

  function handleAjaxSend(event, jqXHR, settings) {
    try {
      if (!settings || !settings.url) return;

      var absoluteUrl = urlUtils.toAbsolute(settings.url, location.href);
      window.postMessage(
        { type: messages.AJAX_URL, url: absoluteUrl },
        targetOrigin()
      );
    } catch (error) {
      // Исключение не должно всплыть в jQuery-стек страницы.
      log.warn('запрос пропущен:', error);
    }
  }

  function install($) {
    try {
      // ajaxSend - глобальное событие: только слушает, не может изменить
      // или отменить запрос. Ровно тот уровень доступа, который нам нужен.
      $(document).ajaxSend(handleAjaxSend);
      log.info('перехватчик установлен');
      return true;
    } catch (error) {
      log.error('не удалось установить перехватчик:', error);
      return false;
    }
  }

  function isJQuery(candidate) {
    return Boolean(candidate && candidate.fn && candidate.fn.jquery);
  }

  // Ждём jQuery опросом, а не подменой window.jQuery через defineProperty:
  // опрос не вмешивается в страницу и не сломается, если она сама
  // переопределит это свойство.
  function waitForJQuery() {
    if (isJQuery(window.jQuery)) {
      install(window.jQuery);
      return;
    }

    var startedAt = Date.now();
    var timer = setInterval(function () {
      if (isJQuery(window.jQuery)) {
        clearInterval(timer);
        install(window.jQuery);
        return;
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        clearInterval(timer);
        log.warn('jQuery не появился за ' + POLL_TIMEOUT_MS / 1000 + ' с, перехват не установлен');
      }
    }, POLL_INTERVAL_MS);
  }

  waitForJQuery();
})();
