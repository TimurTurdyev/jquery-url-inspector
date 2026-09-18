// Точка входа content script (isolated world).
// Инжектит перехватчик в страницу, слушает его сообщения, решает по правилам,
// показывать ли попап.
(function () {
  'use strict';

  var ns = window.__jqueryUrlInspector || {};
  var log = ns.log;
  var messages = ns.messages;
  var urlUtils = ns.url;
  var rules = ns.rules;
  var rulesStore = ns.rulesStore;
  var historyStore = ns.historyStore;
  var popup = ns.popup;

  // Порядок важен: перехватчик рассчитывает на уже загруженные shared-модули.
  var PAGE_SCRIPTS = [
    'shared/log.js',
    'shared/messages.js',
    'shared/url.js',
    'page/interceptor.js'
  ];

  var currentRules = rules.DEFAULT.slice();

  function injectPageScripts() {
    try {
      PAGE_SCRIPTS.forEach(function (file) {
        var script = document.createElement('script');
        script.src = chrome.runtime.getURL(file);

        // Динамически созданные скрипты по умолчанию асинхронные; async = false
        // возвращает им гарантированный порядок выполнения.
        script.async = false;
        script.addEventListener('load', function () {
          script.remove();
        });

        (document.head || document.documentElement).appendChild(script);
      });
    } catch (error) {
      // Расширение перезагрузили, а вкладка осталась со старым content script:
      // chrome.runtime уже недействителен. Вкладку нужно перезагрузить.
      log.warn('перехватчик не внедрён, перезагрузите вкладку:', error);
    }
  }

  function isOwnMessage(event) {
    if (event.source !== window) return false;

    // На страницах без нормального origin (file://, песочница) сравнивать нечего.
    if (location.origin && location.origin !== 'null' && event.origin !== location.origin) {
      return false;
    }

    var data = event.data;
    return Boolean(data && data.type === messages.AJAX_URL && typeof data.url === 'string');
  }

  function onMessage(event) {
    try {
      if (!isOwnMessage(event)) return;

      var url = event.data.url;
      var rule = rules.match(url, currentRules);
      if (!rule) return;

      var patchedUrl = urlUtils.appendParams(url, rule.params);
      log.info('перехвачен URL:', url);

      historyStore.add({
        url: url,
        patchedUrl: patchedUrl,
        at: Date.now()
      });

      popup.show(patchedUrl);
    } catch (error) {
      log.error('не удалось обработать перехваченный URL:', error);
    }
  }

  rulesStore.load(function (loaded) {
    currentRules = loaded;
  });

  rulesStore.subscribe(function (updated) {
    currentRules = updated;
    log.info('правила обновлены, активных:', updated.length);
  });

  window.addEventListener('message', onMessage);
  injectPageScripts();
})();
