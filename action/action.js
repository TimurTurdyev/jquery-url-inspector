// Попап кнопки расширения: список перехваченных запросов.
// Основное место работы с URL - плашка на странице только уведомляет.
(function () {
  'use strict';

  var ns = window.__jqueryUrlInspector || {};
  var historyStore = ns.historyStore;
  var urlUtils = ns.url;

  var listEl = document.getElementById('list');
  var clearButton = document.getElementById('clear');
  var optionsButton = document.getElementById('open-options');

  function formatTime(timestamp) {
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return false; }
      );
    }

    return Promise.resolve(false);
  }

  function openInTab(url) {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.create) return;
    chrome.tabs.create({ url: url });
  }

  function renderItem(entry) {
    var item = document.createElement('div');
    item.className = 'item';

    var meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = formatTime(entry.at);

    var url = document.createElement('div');
    url.className = 'url';
    url.textContent = urlUtils.shortLabel(entry.patchedUrl);
    url.title = entry.patchedUrl;

    var actions = document.createElement('div');
    actions.className = 'actions';

    var copyButton = document.createElement('button');
    copyButton.textContent = 'Копировать';
    copyButton.addEventListener('click', function () {
      copyToClipboard(entry.patchedUrl).then(function (copied) {
        copyButton.textContent = copied ? '✓ Скопировано' : 'Ошибка';
        copyButton.classList.add('done');

        setTimeout(function () {
          copyButton.textContent = 'Копировать';
          copyButton.classList.remove('done');
        }, 1500);
      });
    });

    var openButton = document.createElement('button');
    openButton.textContent = 'Открыть';
    openButton.addEventListener('click', function () {
      openInTab(entry.patchedUrl);
    });

    actions.appendChild(copyButton);
    actions.appendChild(openButton);

    item.appendChild(meta);
    item.appendChild(url);
    item.appendChild(actions);
    return item;
  }

  function render(entries) {
    listEl.textContent = '';

    if (!entries.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Пока ничего не перехвачено. Откройте страницу, где срабатывает правило.';
      listEl.appendChild(empty);
      clearButton.hidden = true;
      return;
    }

    clearButton.hidden = false;
    entries.forEach(function (entry) {
      listEl.appendChild(renderItem(entry));
    });
  }

  clearButton.addEventListener('click', function () {
    historyStore.clear(function () {
      render([]);
    });
  });

  optionsButton.addEventListener('click', function () {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.openOptionsPage) {
      return;
    }

    chrome.runtime.openOptionsPage();
    window.close();
  });

  historyStore.load(render);
})();
