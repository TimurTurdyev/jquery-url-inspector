// Логирование с постоянным префиксом. Файл исполняется во всех контекстах:
// в странице, в content script и на странице настроек.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});
  var PREFIX = '[jquery-url-inspector]';

  ns.log = {
    info: function () {
      console.log.apply(console, [PREFIX].concat([].slice.call(arguments)));
    },

    warn: function () {
      console.warn.apply(console, [PREFIX].concat([].slice.call(arguments)));
    },

    error: function () {
      console.error.apply(console, [PREFIX].concat([].slice.call(arguments)));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
