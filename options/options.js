// Страница настроек: редактирование списка правил в chrome.storage.sync.
// К content script и к странице сайта отношения не имеет - общее только хранилище.
(function () {
  'use strict';

  var ns = window.__jqueryUrlInspector || {};
  var rulesStore = ns.rulesStore;

  var tableBody = document.getElementById('rules');
  var statusEl = document.getElementById('status');

  var statusTimer = null;

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? 'status error' : 'status';

    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      statusEl.textContent = '';
    }, 2500);
  }

  function createInput(value, placeholder) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder;
    return input;
  }

  function addRow(rule) {
    var row = document.createElement('tr');

    var patternCell = document.createElement('td');
    patternCell.appendChild(createInput(rule && rule.pattern, '/api/report/'));

    var paramsCell = document.createElement('td');
    paramsCell.appendChild(createInput(rule && rule.params, 'debug=1&no_cache=1'));

    var removeCell = document.createElement('td');
    var removeButton = document.createElement('button');
    removeButton.className = 'remove';
    removeButton.textContent = '×';
    removeButton.title = 'Удалить правило';
    removeButton.addEventListener('click', function () {
      row.remove();
    });
    removeCell.appendChild(removeButton);

    row.appendChild(patternCell);
    row.appendChild(paramsCell);
    row.appendChild(removeCell);
    tableBody.appendChild(row);
  }

  // Пустые строки отбрасываются молча: это черновики, а не ошибка ввода.
  function collectRules() {
    var collected = [];

    Array.prototype.forEach.call(tableBody.querySelectorAll('tr'), function (row) {
      var inputs = row.querySelectorAll('input');
      var pattern = inputs[0].value.trim();
      var params = inputs[1].value.trim();

      if (pattern && params) collected.push({ pattern: pattern, params: params });
    });

    return collected;
  }

  function save() {
    var collected = collectRules();

    if (!collected.length) {
      setStatus('Нужно хотя бы одно заполненное правило', true);
      return;
    }

    rulesStore.save(collected, function (saved) {
      setStatus(
        saved ? 'Сохранено' : 'Не удалось сохранить - подробности в консоли',
        !saved
      );
    });
  }

  document.getElementById('add').addEventListener('click', function () {
    addRow(null);
  });

  document.getElementById('save').addEventListener('click', save);

  rulesStore.load(function (loaded) {
    loaded.forEach(addRow);
  });
})();
