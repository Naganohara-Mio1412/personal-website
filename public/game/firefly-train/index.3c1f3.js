System.register(["./application.1c090.js"], function (_export, _context) {
  "use strict";

  var Application, canvas, rect, application;
  return {
    setters: [function (_applicationJs) {
      Application = _applicationJs.Application;
    }],
    execute: function () {
      canvas = document.getElementById('GameCanvas');
      rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      application = new Application(); // Debug构建保留项目DEV面板，但默认性能统计大面板会遮挡底部按钮。
      application.showFPS = false;
      System["import"]('cc').then(function (engine) {
        // Web Mobile生成的settings默认exactFitScreen=true，会覆盖自定义竖屏外壳。
        // 使用3.8.8正式初始化委托覆盖显示配置；不改内部设计分辨率/Camera/场景。
        engine.game.onPostBaseInitDelegate.add(function () {
          engine.settings.overrideSettings('screen', 'exactFitScreen', false);
          engine.settings.overrideSettings('screen', 'orientation', 'auto');
        });
        return application.init(engine);
      }).then(function () {
        return application.start();
      })["catch"](function (error) {
        console.error('[WebBoot] 启动失败，请检查网络后刷新重试', error);
        var message = document.createElement('p');
        message.textContent = '资源加载失败，请检查网络后刷新重试';
        message.style.cssText = 'position:fixed;top:45%;left:0;right:0;text-align:center;color:white';
        document.body.appendChild(message);
      });
    }
  };
});