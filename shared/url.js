// Работа с URL: чистые функции без DOM и chrome.* - исполняются в обоих мирах.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});

  ns.url = {
    // jQuery отдаёт URL таким, каким его передал вызывающий код - как правило
    // относительным. Приводим к абсолютному, чтобы в попапе был хост.
    // Если URL разобрать не удалось, возвращаем исходную строку: показать
    // что-то полезнее, чем не показать ничего.
    toAbsolute: function (url, base) {
      try {
        return new URL(url, base).href;
      } catch (error) {
        return String(url);
      }
    },

    // Короткая подпись для списков и плашки: путь с параметрами, без схемы
    // и хоста. Хост в интерфейсе и так очевиден, а в хвосте URL - id и даты,
    // по которым запрос узнают.
    shortLabel: function (url) {
      try {
        var parsed = new URL(url);
        return parsed.pathname + parsed.search;
      } catch (error) {
        return String(url);
      }
    },

    // Дописывает параметры в конец URL, не трогая уже существующие.
    // Разделитель выбирается по наличию '?' в URL.
    appendParams: function (url, params) {
      if (!params) return url;

      var separator = url.indexOf('?') !== -1 ? '&' : '?';
      return url + separator + params;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
