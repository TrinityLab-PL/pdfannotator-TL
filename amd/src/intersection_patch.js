define([], function() {
    return {
        init: function() {
            const OriginalIO = window.IntersectionObserver;
            window.IntersectionObserver = function(callback, options) {
                return new OriginalIO(function(entries) {
                    entries.forEach(e => e.isIntersecting = true);
                    callback(entries);
                }, options);
            };
        }
    };
});
