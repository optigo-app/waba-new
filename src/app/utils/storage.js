// Centralized storage helper so keys only live in one place.
// Update STORAGE_KEYS when the backend / session naming changes.

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_DATA: 'userData',
  USER_PERMISSIONS: 'userPermissions',
  IS_LOGGED_IN: 'isLoggedIn',
  SOCKET_STATE: 'socketState',
  HAS_SOCKET_ID: 'hasSocketId',
  CAMPAIGN_DRAFT: 'campaignDraftData',
  CAMPAIGN_STEPPER: 'campaignStepperState',
  CAMPAIGN_TIMERS: 'campaignActiveTimers',
  AUDIENCE_DRAFT: 'audienceSelectionDraft',
  CLIENT_IP: 'clientIpAddress',
  FLOW_DRAFT: 'flowDraftData',
};

const isClient = () => typeof window !== 'undefined';

export const storage = {
  // ── raw string ──
  get: (key) => (isClient() ? window.sessionStorage.getItem(key) : null),
  set: (key, value) => {
    if (isClient()) window.sessionStorage.setItem(key, value);
  },
  remove: (key) => {
    if (isClient()) window.sessionStorage.removeItem(key);
  },

  // ── JSON helpers ──
  getJSON: (key) => {
    const raw = storage.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setJSON: (key, value) => storage.set(key, JSON.stringify(value)),

  // ── localStorage ──
  getLocal: (key) => (isClient() ? window.localStorage.getItem(key) : null),
  setLocal: (key, value) => {
    if (isClient()) window.localStorage.setItem(key, value);
  },
  removeLocal: (key) => {
    if (isClient()) window.localStorage.removeItem(key);
  },
  getLocalJSON: (key) => {
    const raw = storage.getLocal(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setLocalJSON: (key, value) => storage.setLocal(key, JSON.stringify(value)),

  clear: () => {
    if (isClient()) window.sessionStorage.clear();
  },
};

// ── Zustand persist adapter factory ──
export const createSessionStorageAdapter = () => ({
  getItem: (name) => storage.getJSON(name),
  setItem: (name, value) => storage.setJSON(name, value),
  removeItem: (name) => storage.remove(name),
});

export const createLocalStorageAdapter = () => ({
  getItem: (name) => storage.getLocalJSON(name),
  setItem: (name, value) => storage.setLocalJSON(name, value),
  removeItem: (name) => storage.removeLocal(name),
});

// ── Convenience wrappers ──
export const getToken = () => storage.getJSON(STORAGE_KEYS.TOKEN);
export const setToken = (value) => storage.setJSON(STORAGE_KEYS.TOKEN, value);
export const removeToken = () => storage.remove(STORAGE_KEYS.TOKEN);

export const getUserData = () => getToken();
export const setUserData = (value) => setToken(value);

export const getUserPermissions = () => storage.getJSON(STORAGE_KEYS.USER_PERMISSIONS);
export const setUserPermissions = (value) => storage.setJSON(STORAGE_KEYS.USER_PERMISSIONS, value);
export const getUserPermissionsLocal = () => storage.getLocalJSON(STORAGE_KEYS.USER_PERMISSIONS);
export const setUserPermissionsLocal = (value) => storage.setLocalJSON(STORAGE_KEYS.USER_PERMISSIONS, value);
export const removeUserPermissionsLocal = () => storage.removeLocal(STORAGE_KEYS.USER_PERMISSIONS);

export const getIsLoggedIn = () => storage.get(STORAGE_KEYS.IS_LOGGED_IN);
export const setIsLoggedIn = (value = 'true') => storage.set(STORAGE_KEYS.IS_LOGGED_IN, value);

export const getSocketState = () => storage.getJSON(STORAGE_KEYS.SOCKET_STATE);
export const setSocketState = (value) => storage.setJSON(STORAGE_KEYS.SOCKET_STATE, value);
export const removeSocketState = () => storage.remove(STORAGE_KEYS.SOCKET_STATE);

export const getHasSocketId = () => storage.get(STORAGE_KEYS.HAS_SOCKET_ID);

export const getClientIp = () => storage.get(STORAGE_KEYS.CLIENT_IP);
export const setClientIp = (value) => storage.set(STORAGE_KEYS.CLIENT_IP, value);

export const getCampaignDraft = () => storage.getJSON(STORAGE_KEYS.CAMPAIGN_DRAFT);
export const setCampaignDraft = (value) => storage.setJSON(STORAGE_KEYS.CAMPAIGN_DRAFT, value);
export const removeCampaignDraft = () => storage.remove(STORAGE_KEYS.CAMPAIGN_DRAFT);

export const getCampaignStepper = () => storage.getJSON(STORAGE_KEYS.CAMPAIGN_STEPPER);
export const setCampaignStepper = (value) => storage.setJSON(STORAGE_KEYS.CAMPAIGN_STEPPER, value);
export const removeCampaignStepper = () => storage.remove(STORAGE_KEYS.CAMPAIGN_STEPPER);

export const getAudienceDraft = () => storage.getJSON(STORAGE_KEYS.AUDIENCE_DRAFT);
export const setAudienceDraft = (value) => storage.setJSON(STORAGE_KEYS.AUDIENCE_DRAFT, value);
export const removeAudienceDraft = () => storage.remove(STORAGE_KEYS.AUDIENCE_DRAFT);

export const getCampaignTimers = () => storage.getLocalJSON(STORAGE_KEYS.CAMPAIGN_TIMERS);
export const setCampaignTimers = (value) => storage.setLocalJSON(STORAGE_KEYS.CAMPAIGN_TIMERS, value);
