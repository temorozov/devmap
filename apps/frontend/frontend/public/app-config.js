(function (window) {
  const origin = window.location.origin;

  window.__APP_CONFIG__ = window.__APP_CONFIG__ || {
    frontendUrl: origin,
    backendUrl: origin,
    apiUrl: origin + '/api',
  };
})(window);
