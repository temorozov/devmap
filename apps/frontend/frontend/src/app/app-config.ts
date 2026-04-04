type RuntimeAppConfig = {
  frontendUrl: string;
  backendUrl: string;
  apiUrl: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeAppConfig;
  }
}

const fallbackOrigin =
  typeof window !== 'undefined' ? window.location.origin : '';

function normalizeConfig(config: Partial<RuntimeAppConfig> | undefined): RuntimeAppConfig {
  const frontendUrl = config?.frontendUrl || fallbackOrigin;
  const backendUrl = config?.backendUrl || fallbackOrigin;
  const apiUrl = config?.apiUrl || `${backendUrl}/api`;

  return {
    frontendUrl,
    backendUrl,
    apiUrl,
  };
}

export const appRuntimeConfig = normalizeConfig(window.__APP_CONFIG__);
