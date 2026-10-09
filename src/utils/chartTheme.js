// ============================================
// PRCP · 金融克制风格 · ECharts 调色板（2026-09-29 规范）
// 主序列蓝 #5B8FF9；辅助序列按顺序取 #7D6FFC / #61DDAA / #008685 / #F6903D / #9661BC
// ============================================

// 主序列（蓝色，按规范）
export const COLOR_PRIMARY = '#5B8FF9'

// 辅助序列（按规范顺序循环）
export const PALETTE_AUX = [
  '#7D6FFC',  // 紫蓝
  '#61DDAA',  // 薄荷绿
  '#008685',  // 深青
  '#F6903D',  // 橙色（预警/阈值）
  '#9661BC'   // 紫色
]

// 类别色（用于非时序数据的分类着色）
export const CATEGORY_COLORS = {
  ASSET:       '#5B8FF9',
  LIABILITY:   '#F6903D',
  EQUITY:      '#7D6FFC',
  OFF_BALANCE: '#008685',
  OTHER:       '#61DDAA'
}

// 语义状态色（信息蓝/警示橙/异常红/成功绿；与"上升/下降 ≠ 好/坏"原则）
export const SEMANTIC_COLORS = {
  info:    '#0B6FF2',   // 信息蓝（页签/链接/焦点）
  warning: '#F6903D',   // 阈值/预警（橙色虚线）
  danger:  '#C9332B',   // 异常/超限（红色）
  success: '#1E9E6F',   // 正常/合规（绿色）
  muted:   '#6C7D96'    // 辅助
}

// 基础线/网格/坐标轴
export const AXIS_COLORS = {
  axisLine:   '#D9E5F7',
  splitLine:  '#EEF1F6',
  axisLabel:  '#6C7D96',
  axisName:   '#25334B'
}

// 按索引取调色板颜色（主 + 辅助循环）
export function getChartColor(index) {
  if (index === 0) return COLOR_PRIMARY
  return PALETTE_AUX[(index - 1) % PALETTE_AUX.length]
}

// 按 category 取色
export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || PALETTE_AUX[0]
}

// 通用 ECharts 主题对象（用于 echarts.init 的 theme 参数或 registerTheme）
export const prcpChartTheme = {
  color: [COLOR_PRIMARY, ...PALETTE_AUX],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif',
    color: AXIS_COLORS.axisLabel
  },
  title: {
    textStyle: { color: '#071B4D', fontWeight: 600 }
  },
  legend: {
    textStyle: { color: AXIS_COLORS.axisLabel }
  },
  axisPointer: {
    lineStyle: { color: '#5B8FF9' }
  },
  categoryAxis: {
    axisLine:  { lineStyle: { color: AXIS_COLORS.axisLine } },
    axisTick:  { lineStyle: { color: AXIS_COLORS.axisLine } },
    axisLabel: { color: AXIS_COLORS.axisLabel },
    splitLine: { lineStyle: { color: AXIS_COLORS.splitLine } }
  },
  valueAxis: {
    axisLine:  { lineStyle: { color: AXIS_COLORS.axisLine } },
    axisTick:  { lineStyle: { color: AXIS_COLORS.axisLine } },
    axisLabel: { color: AXIS_COLORS.axisLabel },
    splitLine: { lineStyle: { color: AXIS_COLORS.splitLine } }
  },
  tooltip: {
    backgroundColor: 'rgba(7, 27, 77, 0.92)',
    borderWidth: 0,
    textStyle: { color: '#fff', fontSize: 12 },
    axisPointer: { lineStyle: { color: '#5B8FF9' }, crossStyle: { color: '#5B8FF9' } }
  }
}

// 阈值/预警线样式（橙色虚线，按规范）
export const WARNING_LINE_STYLE = {
  color: '#F6903D',
  type: 'dashed',
  width: 1.5
}

// 基准线样式（灰蓝色）
export const BASELINE_LINE_STYLE = {
  color: '#97A3B6',
  type: 'solid',
  width: 1
}