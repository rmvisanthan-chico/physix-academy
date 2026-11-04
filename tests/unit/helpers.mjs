/* Test helper: minimal DOM/browser stubs so pure-data modules can be
 * imported under node:test without a real browser. */
export function stubBrowser() {
  const noop = () => {};
  const fakeStyle = { setProperty: noop, getPropertyValue: () => '' };
  const fakeEl = () => ({
    style: fakeStyle,
    classList: { add: noop, remove: noop, toggle: noop },
    appendChild: noop,
    removeChild: noop,
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    dataset: {},
    textContent: '',
    innerHTML: ''
  });

  if (!globalThis.localStorage) {
    globalThis.localStorage = {
      _data: {},
      getItem(k) {
        return this._data[k] ?? null;
      },
      setItem(k, v) {
        this._data[k] = String(v);
      },
      removeItem(k) {
        delete this._data[k];
      },
      clear() {
        this._data = {};
      },
      get length() {
        return Object.keys(this._data).length;
      },
      key(i) {
        return Object.keys(this._data)[i];
      }
    };
  }
  if (!globalThis.document) {
    globalThis.document = {
      createElement: fakeEl,
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      removeEventListener: noop,
      body: fakeEl(),
      documentElement: fakeEl(),
      head: fakeEl()
    };
  }
  const baseWindow = { addEventListener: noop, removeEventListener: noop };
  if (!globalThis.window) globalThis.window = baseWindow;
  if (!globalThis.addEventListener) globalThis.addEventListener = noop;
  if (!globalThis.removeEventListener) globalThis.removeEventListener = noop;
  if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node-test' };
  if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };
  if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = noop;
  if (!globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame = noop;
}

export function restoreBrowser() {
  /* Nothing to restore — stubs stay for the duration of the test process. */
}
