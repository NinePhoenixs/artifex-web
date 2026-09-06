import '@testing-library/jest-dom/vitest'

/**
 * jsdom 没有实现 matchMedia，而 antd 的响应式组件（Grid / Table 等）会用到它。
 * 不 mock 的话组件测试会直接抛错，这是接 antd 时最常见的一个坑。
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
