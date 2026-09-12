/* Web外壳仅处理DOM尺寸/浏览器默认行为，不接触Gameplay或存档。 */
(function () {
    'use strict';
    var stage = document.getElementById('WebGameStage');
    var frame = document.getElementById('GameDiv');
    var canvas = document.getElementById('GameCanvas');
    if (!stage || !frame || !canvas) return;
    function fit() {
        var css = getComputedStyle(stage);
        var width = stage.clientWidth - parseFloat(css.paddingLeft || 0) - parseFloat(css.paddingRight || 0);
        var height = stage.clientHeight - parseFloat(css.paddingTop || 0) - parseFloat(css.paddingBottom || 0);
        var fitWidth = Math.max(1, Math.min(width, height * 9 / 16));
        frame.style.width = fitWidth + 'px';
        frame.style.height = fitWidth * 16 / 9 + 'px';
    }
    function preventCanvasDefault(event) { event.preventDefault(); }
    function focusCanvas() { canvas.focus({ preventScroll: true }); }
    canvas.addEventListener('contextmenu', preventCanvasDefault);
    canvas.addEventListener('selectstart', preventCanvasDefault);
    canvas.addEventListener('touchmove', preventCanvasDefault, { passive: false });
    canvas.addEventListener('pointerdown', focusCanvas);
    // 先于引擎注册resize，让引擎读到新矩形；ResizeObserver覆盖手机工具栏变化。
    window.addEventListener('resize', fit);
    var observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (observer) observer.observe(stage);
    fit();
    // 页面级外壳随文档销毁；不在场景重试时重复注册，也不使用全局输入兜底。
}());
