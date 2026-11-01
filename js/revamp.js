// Time-bound offer text uses an explicit Pacific deadline.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('nav.site');
    if (nav && nav.querySelector('.mobile-menu-toggle')) nav.classList.add('nav-ready');
    document.querySelectorAll('[data-offer-until]').forEach(function (el) {
      if (Date.now() >= new Date(el.getAttribute('data-offer-until')).getTime()) el.hidden = true;
    });
  });
})();
