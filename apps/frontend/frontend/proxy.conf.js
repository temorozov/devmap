const backendPort = process.env.PORT || '3000';
const backendUrl = process.env.DEV_BACKEND_URL || `http://localhost:${backendPort}`;

module.exports = {
  '/api': {
    target: backendUrl,
    secure: false,
    changeOrigin: true,
  },
};
