// Единственная точка доступа к правилам в chrome.storage.sync.
// Используется и content script, и страницей настроек.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});
  var log = ns.log;
  var rules = ns.rules;

  var STORAGE_KEY = 'rules';

  // chrome.runtime.id пропадает, когда расширение перезагрузили, а вкладка
  // осталась открытой со старым content script. Без этой проверки каждый
  // вызов сыпал бы "Extension context invalidated".
  function isStorageAvailable() {
    try {
      return Boolean(
        typeof chrome !== 'undefined' &&
        chrome.runtime && chrome.runtime.id &&
        chrome.storage && chrome.storage.sync
      );
    } catch (error) {
      return false;
    }
  }

  ns.rulesStore = {
    STORAGE_KEY: STORAGE_KEY,

    // Отдаёт нормализованный список. Недоступность хранилища не фатальна:
    // расширение продолжает работать на правиле по умолчанию.
    load: function (callback) {
      if (!isStorageAvailable()) {
        log.warn('chrome.storage недоступен, применяю правило по умолчанию');
        callback(rules.DEFAULT.slice());
        return;
      }

      chrome.storage.sync.get(STORAGE_KEY, function (data) {
        if (chrome.runtime.lastError) {
          log.warn('не удалось прочитать правила:', chrome.runtime.lastError.message);
          callback(rules.DEFAULT.slice());
          return;
        }

        callback(rules.normalize(data && data[STORAGE_KEY]));
      });
    },

    save: function (list, callback) {
      if (!isStorageAvailable()) {
        log.error('chrome.storage недоступен, правила не сохранены');
        if (callback) callback(false);
        return;
      }

      var payload = {};
      payload[STORAGE_KEY] = list;

      chrome.storage.sync.set(payload, function () {
        if (chrome.runtime.lastError) {
          log.error('не удалось сохранить правила:', chrome.runtime.lastError.message);
          if (callback) callback(false);
          return;
        }

        if (callback) callback(true);
      });
    },

    // Правки в настройках применяются без перезагрузки вкладки.
    subscribe: function (callback) {
      if (!isStorageAvailable() || !chrome.storage.onChanged) return;

      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'sync' || !changes[STORAGE_KEY]) return;

        callback(rules.normalize(changes[STORAGE_KEY].newValue));
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
