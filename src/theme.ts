import type { ThemeConfig } from 'antd'

/** 对齐产品原型的视觉：深蓝主色、较大圆角、克制的灰阶。 */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorError: '#dc2626',
    colorTextBase: '#0f172a',
    borderRadius: 8,
    fontSize: 14,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 56,
      siderBg: '#ffffff',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      itemBorderRadius: 8,
      itemSelectedBg: '#eff4ff',
      itemSelectedColor: '#2563eb',
    },
    Card: { borderRadiusLG: 12 },
    Table: { headerBg: '#fafbfc' },
  },
}
