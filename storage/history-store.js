// История перехваченных запросов.
//
// Хранится в chrome.storage.local, а не sync: записей много, они короткоживущие
// и синхронизировать их между устройствами незачем - квота sync мала.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});
  var log = ns.log;

  var STORAGE_KEY = 'history';
  var LIMIT = 50;

  // chrome.runtime.id пропадает, когда расширение перезагрузили, а вкладка
  // осталась открытой со старым content script. Без этой проверки каждый
  // вызов сыпал бы "Extension context invalidated".
  function isStorageAvailable() {
    try {
      return Boolean(
        typeof chrome !== 'undefined' &&
        chrome.runtime && chrome.runtime.id &&
        chrome.storage && chrome.storage.local
      );
    } catch (error) {
      return false;
    }
  }

  function readRaw(callback) {
    chrome.storage.local.get(STORAGE_KEY, function (data) {
      if (chrome.runtime.lastError) {
        log.warn('не удалось прочитать историю:', chrome.runtime.lastError.message);
        callback([]);
        return;
      }

      var list = data && data[STORAGE_KEY];
      callback(Array.isArray(list) ? list : []);
    });
  }

  ns.historyStore = {
    STORAGE_KEY: STORAGE_KEY,
    LIMIT: LIMIT,

    load: function (callback) {
      if (!isStorageAvailable()) {
        callback([]);
        return;
      }

      readRaw(callback);
    },

    // Новые записи сверху. Повтор того же URL подряд не добавляется:
    // страница нередко переспрашивает один и тот же отчёт, и список
    // засорялся бы одинаковыми строками.
    add: function (entry, callback) {
      if (!isStorageAvailable()) {
        if (callback) callback(false);
        return;
      }

      readRaw(function (list) {
        if (list.length && list[0].patchedUrl === entry.patchedUrl) {
          if (callback) callback(false);
          return;
        }

        var updated = [entry].concat(list).slice(0, LIMIT);
        var payload = {};
        payload[STORAGE_KEY] = updated;

        chrome.storage.local.set(payload, function () {
          if (chrome.runtime.lastError) {
            log.warn('не удалось записать историю:', chrome.runtime.lastError.message);
            if (callback) callback(false);
            return;
          }

          if (callback) callback(true);
        });
      });
    },

    clear: function (callback) {
      if (!isStorageAvailable()) {
        if (callback) callback(false);
        return;
      }

      chrome.storage.local.remove(STORAGE_KEY, function () {
        if (callback) callback(!chrome.runtime.lastError);
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
