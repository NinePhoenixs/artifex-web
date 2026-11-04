import type { ThemeConfig } from 'antd'

/**
 * 稿谱品牌：稿纸白打底、墨谱蓝唯一强调色、音符金只用在标志上。
 */
export const brand = {
  paper: '#F6F4EF',
  ink: '#2C4E92',
  inkSoft: '#EDF1F8',
  gold: '#D4A63A',
  line: '#E7E3DA',
  text: '#1D1D1F',
}

export const theme: ThemeConfig = {
  token: {
    colorPrimary: brand.ink,
    colorInfo: brand.ink,
    colorLink: brand.ink,
    colorSuccess: '#2E7D4F',
    colorError: '#C2412D',
    colorTextBase: brand.text,
    colorBorderSecondary: brand.line,
    borderRadius: 8,
    fontSize: 14,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      headerHeight: 56,
      siderBg: '#FFFFFF',
      bodyBg: brand.paper,
    },
    Menu: {
      itemBorderRadius: 8,
      itemSelectedBg: brand.inkSoft,
      itemSelectedColor: brand.ink,
    },
    Card: { borderRadiusLG: 12 },
    Table: { headerBg: '#FAF9F6', rowHoverBg: '#FAF9F6' },
  },
}
