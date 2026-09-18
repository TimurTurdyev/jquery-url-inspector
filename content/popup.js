// Уведомление о перехвате. Живёт в isolated world: имеет доступ к DOM страницы,
// но не к её JavaScript.
//
// Намеренно компактное: полный список перехваченных URL доступен под кнопкой
// расширения, поэтому плашке достаточно сообщить о факте перехвата и дать
// скопировать ссылку одним кликом. Через несколько секунд она уходит сама,
// чтобы не перекрывать интерфейс страницы.
//
// Разметка собирается через createElement + textContent - URL приходит со
// страницы и считается недоверенным вводом. Стили изолированы в Shadow DOM.
(function (root) {
  'use strict';

  var ns = (root.__jqueryUrlInspector = root.__jqueryUrlInspector || {});
  var log = ns.log;

  var HOST_ID = 'jquery-url-inspector-popup';
  var AUTO_HIDE_MS = 8000;

  // Функция снятия обработчиков текущей плашки - вызывается перед показом
  // следующей и при закрытии.
  var activeCleanup = null;

  var HOST_STYLE = [
    'all: initial',
    'position: fixed',
    'right: 16px',
    'bottom: 16px',
    'width: min(460px, calc(100vw - 32px))',
    'z-index: 2147483647'
  ].join(';');

  var SHADOW_STYLE = [
    ':host { display: block; }',
    '.panel {',
    '  background: #1e1e2e;',
    '  color: #e0e0e0;',
    '  border: 1px solid #2e7d4f;',
    '  border-radius: 10px;',
    '  box-shadow: 0 8px 28px rgba(0, 0, 0, .4);',
    '  font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '  padding: 10px 12px;',
    '  box-sizing: border-box;',
    '  opacity: 0;',
    '  transform: translateY(8px);',
    '  transition: opacity .18s ease, transform .18s ease;',
    '}',
    '.panel.shown { opacity: 1; transform: translateY(0); }',
    '.head {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-bottom: 6px;',
    '}',
    '.title {',
    '  font-weight: 600;',
    '  color: #7ee6a8;',
    '  font-size: 12px;',
    '  flex: 1;',
    '}',
    '.url {',
    '  font-family: ui-monospace, Menlo, Consolas, monospace;',
    '  font-size: 11px;',
    '  color: #cfd3e0;',
    '  background: #2a2a3c;',
    '  border-radius: 5px;',
    '  padding: 6px 8px;',
    '  white-space: nowrap;',
    '  overflow: hidden;',
    '  text-overflow: ellipsis;',
    '}',
    'button {',
    '  font: inherit;',
    '  font-weight: 600;',
    '  font-size: 11px;',
    '  padding: 4px 10px;',
    '  border-radius: 5px;',
    '  border: none;',
    '  cursor: pointer;',
    '  background: #3a3a4e;',
    '  color: #cfd3e0;',
    '  flex: none;',
    '}',
    'button:hover { background: #4a4a60; }',
    'button.done { background: #2e7d4f; color: #fff; }',
    'button.close {',
    '  background: transparent;',
    '  color: #7b8194;',
    '  padding: 4px 6px;',
    '  font-size: 14px;',
    '  line-height: 1;',
    '}',
    'button.close:hover { color: #fff; background: transparent; }'
  ].join('\n');

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return false; }
      );
    }

    // Фолбэк для страниц без secure context.
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(textarea);
      textarea.select();

      var copied = document.execCommand('copy');
      textarea.remove();
      return Promise.resolve(copied);
    } catch (error) {
      log.warn('копирование не удалось:', error);
      return Promise.resolve(false);
    }
  }

  function remove() {
    // Снять обработчики предыдущей плашки обязательно: удаление узла из DOM
    // не убирает слушатель keydown с document, и они копились бы с каждым
    // новым перехватом.
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }

    var existing = document.getElementById(HOST_ID);
    if (existing) existing.remove();
  }

  // Показывает плашку со ссылкой.
  // Предыдущая удаляется - плашки не копятся.
  function show(patchedUrl) {
    remove();

    var host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = HOST_STYLE;

    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = SHADOW_STYLE;

    var panel = document.createElement('div');
    panel.className = 'panel';

    var head = document.createElement('div');
    head.className = 'head';

    var title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Отладка запроса';

    var copyButton = document.createElement('button');
    copyButton.textContent = 'Копировать';

    var closeButton = document.createElement('button');
    closeButton.className = 'close';
    closeButton.textContent = '×';
    closeButton.title = 'Закрыть';

    head.appendChild(title);
    head.appendChild(copyButton);
    head.appendChild(closeButton);

    var urlEl = document.createElement('div');
    urlEl.className = 'url';
    urlEl.textContent = ns.url.shortLabel(patchedUrl);
    urlEl.title = patchedUrl;

    panel.appendChild(head);
    panel.appendChild(urlEl);

    shadow.appendChild(style);
    shadow.appendChild(panel);
    document.body.appendChild(host);

    // Форсируем reflow, чтобы сработал переход появления.
    void panel.offsetWidth;
    panel.classList.add('shown');

    var hideTimer = null;

    function onKeyDown(event) {
      if (event.key === 'Escape') close();
    }

    function cleanup() {
      clearTimeout(hideTimer);
      document.removeEventListener('keydown', onKeyDown);
    }

    function close() {
      cleanup();
      activeCleanup = null;
      panel.classList.remove('shown');
      setTimeout(function () { host.remove(); }, 200);
    }

    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(close, AUTO_HIDE_MS);
    }

    // Пока курсор на плашке, она не исчезает - иначе она уедет
    // прямо под рукой у того, кто до неё тянется.
    panel.addEventListener('mouseenter', function () {
      clearTimeout(hideTimer);
    });
    panel.addEventListener('mouseleave', scheduleHide);

    closeButton.addEventListener('click', close);

    copyButton.addEventListener('click', function () {
      clearTimeout(hideTimer);

      copyToClipboard(patchedUrl).then(function (copied) {
        copyButton.textContent = copied ? '✓ Скопировано' : 'Ошибка';
        copyButton.classList.add('done');

        setTimeout(function () {
          copyButton.textContent = 'Копировать';
          copyButton.classList.remove('done');
          scheduleHide();
        }, 1500);
      });
    });

    document.addEventListener('keydown', onKeyDown);
    activeCleanup = cleanup;
    scheduleHide();
  }

  ns.popup = { show: show, remove: remove };
})(typeof window !== 'undefined' ? window : globalThis);
