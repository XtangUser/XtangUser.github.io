/**
 * busuanzi-fix.js
 * 修复不蒜子访问量有时不显示的 bug。
 * 核心问题：不蒜子 JSONP 请求偶尔静默失败，导致容器永久隐藏。
 * 解决方案：超时后自动重试，最终失败则展示占位符 "--"。
 */
(function () {
  'use strict';

  var INITIAL_DELAY = 5000; // 首次检查延迟（ms），等待原始请求有机会返回
  var RETRY_DELAY   = 5000; // 重试间隔（ms）
  var REQUEST_TIMEOUT = 8000; // 单次 JSONP 请求超时（ms）
  var MAX_RETRIES   = 2;    // 最多重试次数

  // 容器 id → 值 id 的映射
  var CONTAINERS = {
    busuanzi_container_site_pv : 'busuanzi_value_site_pv',
    busuanzi_container_site_uv : 'busuanzi_value_site_uv',
    busuanzi_container_page_pv : 'busuanzi_value_page_pv'
  };

  /** 页面上是否存在任意不蒜子容器 */
  function hasContainers() {
    return Object.keys(CONTAINERS).some(function (id) {
      return document.getElementById(id) !== null;
    });
  }

  /** 是否已有容器成功显示 */
  function isAnyVisible() {
    return Object.keys(CONTAINERS).some(function (id) {
      var el = document.getElementById(id);
      return el && el.style.display !== 'none' && el.style.display !== '';
    });
  }

  /** 全部失败后显示兜底占位符 */
  function showFallback() {
    Object.keys(CONTAINERS).forEach(function (containerId) {
      var container = document.getElementById(containerId);
      var value     = document.getElementById(CONTAINERS[containerId]);
      if (container && value && container.style.display === 'none') {
        value.innerHTML = '--';
        container.style.display = 'inline';
      }
    });
  }

  /**
   * 主动发起一次不蒜子 JSONP 请求。
   * @param {function(boolean)} callback - 成功传 true，失败传 false
   */
  function fetchBusuanzi(callback) {
    var callbackName = 'bsz_fix_' + Date.now();
    var script = document.createElement('script');
    var timer;

    function cleanup(success) {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
      callback(success);
    }

    window[callbackName] = function (data) {
      if (typeof bszTag !== 'undefined') {
        bszTag.texts(data);
        bszTag.shows();
      }
      cleanup(true);
    };

    script.src = '//busuanzi.ibruce.info/busuanzi?jsonpCallback=' + callbackName;
    script.referrerPolicy = 'no-referrer-when-downgrade';
    script.onerror = function () { cleanup(false); };

    timer = setTimeout(function () { cleanup(false); }, REQUEST_TIMEOUT);

    document.head.appendChild(script);
  }

  /**
   * 递归重试逻辑。
   * @param {number} attempt - 当前重试次数（从 0 开始）
   */
  function retry(attempt) {
    if (!hasContainers()) return; // 本页无不蒜子元素，跳过
    if (isAnyVisible()) return;   // 已正常显示，无需重试

    if (attempt >= MAX_RETRIES) {
      showFallback(); // 超过最大重试次数，显示占位符
      return;
    }

    fetchBusuanzi(function (success) {
      if (!success && !isAnyVisible()) {
        setTimeout(function () { retry(attempt + 1); }, RETRY_DELAY);
      }
    });
  }

  // 等待初始请求有机会完成后再检查
  setTimeout(function () { retry(0); }, INITIAL_DELAY);
})();
