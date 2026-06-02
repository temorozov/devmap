import axios from 'axios';

module.exports = async function () {
  // Configure axios for tests to use.
  const baseURL = process.env.BACKEND_URL;

  if (!baseURL) {
    throw new Error('BACKEND_URL must be set for backend e2e');
  }

  axios.defaults.baseURL = baseURL;
};
