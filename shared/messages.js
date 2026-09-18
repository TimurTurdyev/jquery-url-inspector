// Типы сообщений, которыми обмениваются контекст страницы и content script.
// Единственный канал между мирами - window.postMessage.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});

  ns.messages = {
    // Страница → content script: перехвачен AJAX-запрос, вот его абсолютный URL.
    AJAX_URL: 'JQUERY_URL_INSPECTOR_HIT'
  };
})(typeof window !== 'undefined' ? window : globalThis);
