#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/app-config.js
(function (window) {
  window.__APP_CONFIG__ = {
    frontendUrl: "${FRONTEND_URL}",
    backendUrl: "${BACKEND_URL}",
    apiUrl: "${API_URL}"
  };
})(window);
EOF
