/**
 * Enhanced Fullscreen for PDF Annotator - Trinity Lab
 * Simplified version without AMD compilation
 * @author Piotr Fr 2025
 */

(function() {
    'use strict';
    
    console.log('TL Fullscreen Enhanced loaded (simple version)');
    
    // Czekamy aż DOM będzie gotowy
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFullscreen);
    } else {
        setTimeout(initFullscreen, 2000);
    }
    
    function initFullscreen() {
        var isFullscreen = false;
        var pdfContainer = document.querySelector('#viewer');
        
        if (!pdfContainer) {
            console.log('PDF container not found');
            return;
        }
        
        // Znajdź lub stwórz przycisk fullscreen
        var fullscreenBtn = document.querySelector('#toggle_fullscreen, .fullscreen-button, [title*="fullscreen"]');
        
        if (!fullscreenBtn) {
            var toolbarContent = document.querySelector("#toolbarContent");
            if (toolbarContent) {
                fullscreenBtn = document.createElement("button");
                fullscreenBtn.id = "tl-fullscreen-btn";
                fullscreenBtn.className = "btn btn-secondary";
                fullscreenBtn.innerHTML = "<i class=\"fa fa-expand\"></i> Full screen";
                fullscreenBtn.title = "Full screen (ESC to exit)";
                fullscreenBtn.style.marginLeft = "5em";
                var dropdownButton = document.querySelector("#toolbar-dropdown-button");
                toolbarContent.insertBefore(fullscreenBtn, dropdownButton);
            } else {
                console.log('Toolbar not found');
                return;
            }
        }
        
        // Funkcja włączania fullscreen
        function enterFullscreen() {
            var elem = document.documentElement;
            
            // HTML5 Fullscreen API
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
            
            // Ukryj wszystko poza PDF
            document.body.classList.add('tl-pdf-fullscreen');

            // Zoom 200% fix
            var lastScale = 1.0;
            setInterval(function() {
                var svg = document.querySelector('svg[data-pdf-annotate-viewport]');
                if (!svg) return;
                var viewport = JSON.parse(svg.getAttribute('data-pdf-annotate-viewport'));
                var currentScale = viewport.scale;
                
                if (currentScale !== lastScale) {
                    lastScale = currentScale;
                    var cw = document.getElementById('content-wrapper');
                    
                    if (currentScale >= 2.0) {
                        if (cw) cw.classList.add('zoom-200');
                    } else {
                        if (cw) cw.classList.remove('zoom-200');
                    }
                }
            }, 50);
            document.documentElement.style.height = '100%';
            document.body.style.height = '100%';
            
            var elementsToHide = document.querySelectorAll('#page-header, #page-footer, .breadcrumb, nav:not(#pdftoolbar), .navbar, #block-region-side-pre, #block-region-side-post, .commentscontainer, #commentscontainer, .rightcolumn');
            elementsToHide.forEach(function(el) {
                el.style.display = 'none';
            });
            
            // Rozciągnij PDF
            pdfContainer.classList.add('tl-fullscreen-active');
            
            // Dodaj przycisk zamykający
            if (!document.getElementById('tl-exit-fullscreen')) {
                var exitBtn = document.createElement('button');
                exitBtn.id = 'tl-exit-fullscreen';
                exitBtn.innerHTML = '<i class="fa fa-times"></i>';
                exitBtn.title = 'Zamknij pełny ekran (ESC)';
                exitBtn.onclick = exitFullscreen;
                document.body.appendChild(exitBtn);
            }
            
            isFullscreen = true;
        }
        
        // Funkcja wyłączania fullscreen
        function exitFullscreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            
            // Przywróć widoczność
            document.body.classList.remove('tl-pdf-fullscreen');
            
            var elementsToShow = document.querySelectorAll('#page-header, #page-footer, .breadcrumb, nav, .navbar, #block-region-side-pre, #block-region-side-post, .commentscontainer, #commentscontainer, .rightcolumn');
            elementsToShow.forEach(function(el) {
                el.style.display = '';
            });
            
            pdfContainer.classList.remove('tl-fullscreen-active');
            
            var exitBtn = document.getElementById('tl-exit-fullscreen');
            if (exitBtn) {
                exitBtn.remove();
            }
            
            isFullscreen = false;
        }
        
        // Kliknięcie w przycisk fullscreen
        fullscreenBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!isFullscreen) {
                enterFullscreen();
            } else {
                exitFullscreen();
            }
        });
        
        // Obsługa ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isFullscreen) {
                exitFullscreen();
            }
        });
        
        // Wykryj wyjście z fullscreen (F11)
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
        
        function handleFullscreenChange() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && 
                !document.mozFullScreenElement && !document.msFullscreenElement) {
                if (isFullscreen) {
                    exitFullscreen();
                }
            }
        }
    }
})();


// Toggle komentarzy - JEDYNY
(function() {
    setTimeout(function() {
    console.log("CC setTimeout start");
        var wrapper = document.querySelector('#comment-wrapper');
        var toolbarContent = document.querySelector('#toolbarContent');
        console.log("CC check elements:", wrapper, toolbarContent, fullscreenBtn);
        if (!wrapper || !toolbarContent) return;
        
        var btn = document.createElement('button');
        btn.id = 'tl-toggle-comments';
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fa fa-chevron-right"></i> Close comments';
        btn.style.marginLeft = '80px';
        
        var fullscreenBtn = document.querySelector('#tl-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.parentNode.insertBefore(btn, fullscreenBtn.nextSibling);
        }
        
        btn.onclick = function() {
            var commentWrapper = document.getElementById('comment-wrapper');
            if (wrapper.style.display === 'none') {
                wrapper.style.display = 'block';
                btn.innerHTML = '<i class="fa fa-chevron-right"></i> Close comments';
                if (commentWrapper) {
                    commentWrapper.classList.remove('tl-comments-hidden');
                }
            } else {
                wrapper.style.display = 'none';
                btn.innerHTML = '<i class="fa fa-chevron-left"></i> Open comments';
                if (commentWrapper) {
                    commentWrapper.classList.add('tl-comments-hidden');
                }
            }
        };
    }, 500);
})();

// Globalna funkcja do fixowania layoutu wielostronicowych PDF
window.fixMultipagePDFLayout = function() {
    if (!document.body.classList.contains('tl-pdf-fullscreen')) return;
    
    const pages = document.querySelectorAll('#viewer .page');
    if (pages.length <= 1) return;
    
    let currentTop = 100;
    
    pages.forEach((page) => {
        page.style.position = 'absolute';
        page.style.top = currentTop + 'px';
        page.style.left = '0';
        page.style.transform = '';
        
        const canvas = page.querySelector('canvas');
        if (canvas) {
            const canvasHeight = parseInt(canvas.style.height) || canvas.offsetHeight;
            currentTop += canvasHeight + 20;
        }
    });
    
    const viewer = document.querySelector('#viewer');
    if (viewer) {
        viewer.style.height = currentTop + 'px';
    }
};

// Wymuszaj pozycje co 100ms
let positionInterval = null;
function startPositionEnforcer() {
    if (positionInterval) clearInterval(positionInterval);
    positionInterval = setInterval(() => {
        if (document.body.classList.contains('tl-pdf-fullscreen')) {
//             window.fixMultipagePDFLayout();
        } else {
            clearInterval(positionInterval);
        }
    }, 100);
}

// Uruchom przy fullscreen
document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
        setTimeout(() => {
            window.fixMultipagePDFLayout();
            startPositionEnforcer();
        }, 500);
    }
});

// Reset po wyjściu
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
        const pages = document.querySelectorAll('#viewer .page');
        pages.forEach(page => {
            page.style.position = '';
            page.style.top = '';
            page.style.left = '';
            page.style.transform = '';
            page.style.margin = '';
        });
        const viewer = document.querySelector('#viewer');
        if (viewer) viewer.style.height = '';
    }
});

// Obsługa zoom
setTimeout(function() {
    const scaleSelect = document.querySelector('.scale');
    if (scaleSelect) {
        scaleSelect.addEventListener('change', function() {
            if (document.body.classList.contains('tl-pdf-fullscreen')) {
                setTimeout(() => window.fixMultipagePDFLayout(), 500);
            }
        });
    }
}, 1000);

// Nasłuchuj kliknięcie Delete i napraw modal
document.addEventListener('click', function(e) {
    if (!document.body.classList.contains('tl-pdf-fullscreen')) return;
    
    const target = e.target;
    const isDelete = (target.tagName === 'IMG' && target.src && target.src.includes('delete')) ||
                     (target.querySelector && target.querySelector('img[src*="delete"]'));
    
    if (isDelete) {
        setTimeout(() => {
            const modal = document.querySelector('.modal[role="dialog"]');
            if (modal) {
                modal.style.zIndex = 999999999;
                const yesBtn = modal.querySelector('button[data-action="save"]') || 
                              modal.querySelector('.btn-primary');
                if (yesBtn) yesBtn.focus();
            }
        }, 500);
    }
});

// Nasłuchuj kliknięcie Delete i napraw modal
document.addEventListener('click', function(e) {
    if (!document.body.classList.contains('tl-pdf-fullscreen')) return;
    
    const target = e.target;
    const isDelete = (target.tagName === 'IMG' && target.src && target.src.includes('delete')) ||
                     (target.querySelector && target.querySelector('img[src*="delete"]'));
    
    if (isDelete) {
        setTimeout(() => {
            const modal = document.querySelector('.modal[role="dialog"]');
            if (modal) {
                modal.style.zIndex = 999999999;
                const yesBtn = modal.querySelector('button[data-action="save"]') || 
                              modal.querySelector('.btn-primary');
                if (yesBtn) yesBtn.focus();
            }
        }, 500);
    }
});

// Auto-focus na Yes w modalu (normalny + fullscreen)
const modalObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
            if (node.classList && node.classList.contains('modal')) {
                setTimeout(() => {
                    const yesBtn = node.querySelector('button[data-action="save"]') || 
                                  node.querySelector('.btn-primary');
                    if (yesBtn) yesBtn.focus();
                }, 300);
            }
        });
    });
});

modalObserver.observe(document.body, { childList: true, subtree: true });


// Przenieś modal do fullscreen
setInterval(function() {
    if (!document.body.classList.contains('tl-pdf-fullscreen')) return;
    const modal = document.querySelector('.modal');
    const backdrop = document.querySelector('.modal-backdrop');
    const container = document.querySelector('#pdfannotator_index');
    
    if (backdrop) backdrop.style.display = 'none';
    
    if (modal && container && !container.contains(modal)) {
        container.appendChild(modal);
        modal.style.zIndex = '999999999';
        modal.style.position = 'fixed';
    }
}, 100);

// Fix overlay position
document.addEventListener('DOMNodeInserted', function(e) {
    if (e.target.id === 'pdf-annotate-edit-overlay') {
        var isFullscreen = document.body.classList.contains('tl-pdf-fullscreen');
        if (isFullscreen) {
            e.target.style.transform = 'translate(-10px, -10px)';
        }
    }
});
