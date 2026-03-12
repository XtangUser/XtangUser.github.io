/* global CONFIG, Fluid */

(function(window, document) {
  'use strict';

  const analyticsConfig = (CONFIG.web_analytics && CONFIG.web_analytics.openkounter) || {};
  const API_SERVER = analyticsConfig.server_url || '';

  if (!API_SERVER) {
    console.warn('OpenKounter: server_url is not configured');
    return;
  }

  function getCacheKey(target) {
    return `OpenKounter_Cache:${target}`;
  }

  function readCachedCount(target) {
    try {
      const rawValue = localStorage.getItem(getCacheKey(target));
      const value = parseInt(rawValue || '', 10);
      return Number.isNaN(value) ? 0 : value;
    } catch (error) {
      return 0;
    }
  }

  function writeCachedCount(target, value) {
    try {
      localStorage.setItem(getCacheKey(target), String(value));
    } catch (error) {
      console.warn('OpenKounter: failed to write local cache');
    }
  }

  function getRecord(target) {
    const requestUrl = `${API_SERVER}/api/counter?target=${encodeURIComponent(target)}&_=${Date.now()}`;

    return fetch(requestUrl, {
      cache: 'no-store'
    })
      .then(function(resp) {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        return resp.json();
      })
      .then(function(payload) {
        const data = payload.data || {};
        if (payload.code !== 0) {
          throw new Error(payload.message || 'Unknown error');
        }
        return { time: data.time || 0, objectId: data.target || target };
      })
      .catch(function(error) {
        console.error('OpenKounter fetch error:', error);
        return { time: 0, objectId: target };
      });
  }

  function increment(requests) {
    if (!requests || requests.length === 0) {
      return Promise.resolve([]);
    }

    return fetch(`${API_SERVER}/api/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_inc',
        requests: requests
      })
    })
      .then(function(resp) {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        return resp.json();
      })
      .then(function(payload) {
        if (payload.code !== 0) {
          throw new Error(payload.message || 'Failed to increment counter');
        }
        return payload.data;
      })
      .catch(function(error) {
        console.error('OpenKounter increment error:', error);
      });
  }

  function buildIncrement(target) {
    return { target: target };
  }

  function validHost() {
    if (analyticsConfig.ignore_local === false) {
      return true;
    }

    const hostname = window.location.hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]';
  }

  function getSiteNamespace() {
    return window.location.hostname || 'unknown-host';
  }

  function getSiteTarget(name) {
    return `${getSiteNamespace()}:${name}`;
  }

  function getPageTarget() {
    let rawPath = window.location.pathname;

    if (analyticsConfig.path) {
      try {
        rawPath = eval(analyticsConfig.path);
      } catch (error) {
        console.warn('OpenKounter: failed to evaluate path config, fallback to pathname', error);
      }
    }

    const normalizedPath = decodeURI(String(rawPath || '/').replace(/\/*(index.html)?$/, '/'));
    return `${getSiteNamespace()}:${normalizedPath}`;
  }

  function validUV() {
    const key = `OpenKounter_UV_Flag:${getSiteNamespace()}`;
    const now = Date.now();

    try {
      const flag = localStorage.getItem(key);
      if (flag) {
        const lastVisit = parseInt(flag, 10);
        if (!Number.isNaN(lastVisit) && now - lastVisit <= 86400000) {
          return false;
        }
      }
      localStorage.setItem(key, now.toString());
    } catch (error) {
      console.warn('OpenKounter: localStorage is not available');
    }

    return true;
  }

  function renderCounter(containerSelector, valueSelector, target, shouldIncrement, requests) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      return null;
    }

    return getRecord(target).then(function(record) {
      const cachedCount = readCachedCount(target);
      const remoteCount = record.time || 0;

      if (shouldIncrement) {
        requests.push(buildIncrement(record.objectId));
      }

      const element = document.querySelector(valueSelector);
      if (element) {
        const displayCount = shouldIncrement
          ? Math.max(remoteCount + 1, cachedCount)
          : Math.max(remoteCount, cachedCount);

        element.innerText = displayCount;
        container.style.display = 'inline';
        writeCachedCount(target, displayCount);
      }
    });
  }

  function addCount() {
    const enableIncrement = CONFIG.web_analytics.enable && (!window.Fluid || !Fluid.ctx.dnt) && validHost();
    const requests = [];
    const jobs = [];

    jobs.push(renderCounter(
      '#openkounter-site-pv-container',
      '#openkounter-site-pv',
      getSiteTarget('site-pv'),
      enableIncrement,
      requests
    ));

    jobs.push(renderCounter(
      '#openkounter-site-uv-container',
      '#openkounter-site-uv',
      getSiteTarget('site-uv'),
      enableIncrement && validUV(),
      requests
    ));

    jobs.push(renderCounter(
      '#openkounter-page-views-container',
      '#openkounter-page-views',
      getPageTarget(),
      enableIncrement,
      requests
    ));

    Promise.all(jobs.filter(Boolean)).then(function() {
      if (enableIncrement && requests.length > 0) {
        increment(requests);
      }
    }).catch(function(error) {
      console.error('OpenKounter error:', error);
    });
  }

  addCount();
})(window, document);