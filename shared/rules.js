// Правила "паттерн URL → добавляемые параметры".
// Чистые функции: ни DOM, ни chrome.* - чтение из хранилища живёт в content/.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});

  var DEFAULT_RULES = [
    { pattern: '/api/', params: 'debug=1' }
  ];

  function isValidRule(rule) {
    return Boolean(
      rule &&
      typeof rule.pattern === 'string' && rule.pattern.trim() &&
      typeof rule.params === 'string' && rule.params.trim()
    );
  }

  ns.rules = {
    DEFAULT: DEFAULT_RULES,

    // Приводит данные из хранилища к рабочему виду. Битые записи отбрасываются,
    // пустой результат заменяется правилом по умолчанию - расширение без правил
    // бесполезно, а молчаливая поломка хуже очевидного поведения.
    normalize: function (raw) {
      if (!Array.isArray(raw)) return DEFAULT_RULES.slice();

      var valid = raw.filter(isValidRule).map(function (rule) {
        return { pattern: rule.pattern.trim(), params: rule.params.trim() };
      });

      return valid.length ? valid : DEFAULT_RULES.slice();
    },

    // Первое подошедшее правило или null. Сопоставление по вхождению подстроки -
    // так же, как в исходном сниппете из обсуждения.
    match: function (url, rules) {
      if (!url || !Array.isArray(rules)) return null;

      for (var i = 0; i < rules.length; i++) {
        if (url.indexOf(rules[i].pattern) !== -1) return rules[i];
      }

      return null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
