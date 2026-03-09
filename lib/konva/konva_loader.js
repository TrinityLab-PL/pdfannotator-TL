(function() {
    var savedDefine = window.define;
    window.define = undefined;
    var s = document.createElement('script');
    s.src = (window.M && M.cfg && M.cfg.wwwroot ? M.cfg.wwwroot : '') + '/mod/pdfannotator/lib/konva/konva.min.js?ver=00002';
    s.onload = function() { window.define = savedDefine; };
    s.onerror = function() { window.define = savedDefine; };
    document.head.appendChild(s);
})();
