(function(global) {
  'use strict';

  const STORAGE_KEY = 'one-hour-photo-v3';

  const LocalStorageAdapter = {
    async get() {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        console.warn('读取失败', e);
        return null;
      }
    },
    async set(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        console.warn('保存失败', e);
        return false;
      }
    }
  };

  const URLHashAdapter = {
    async get() {
      try {
        const hash = window.location.hash;
        if (!hash.startsWith('#data=')) return null;
        const raw = decodeURIComponent(hash.slice(6));
        const decompressed = decodeURIComponent(escape(atob(raw)));
        return JSON.parse(decompressed);
      } catch (e) {
        return null;
      }
    },
    async set(data) {
      try {
        const compressed = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        const newHash = '#data=' + encodeURIComponent(compressed);
        history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        return true;
      } catch (e) {
        console.warn('URL 同步失败 (可能数据过大)', e);
        return false;
      }
    }
  };

  global.Storage = {
    LocalStorageAdapter: LocalStorageAdapter,
    URLHashAdapter: URLHashAdapter,

    async load() {
      const fromUrl = await URLHashAdapter.get();
      if (fromUrl) {
        await LocalStorageAdapter.set(fromUrl);
        return fromUrl;
      }
      return await LocalStorageAdapter.get();
    },

    async save(data) {
      await LocalStorageAdapter.set(data);
    },

    async generateShareLink(data) {
      const baseUrl = window.location.origin + window.location.pathname;
      return baseUrl;
    }
  };

})(window);
