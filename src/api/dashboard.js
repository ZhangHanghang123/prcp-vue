/**
 * @file 驾驶舱 (Dashboard) API 封装
 * @desc 对应后端 com.prcp.dashboard.DashboardController
 *       提供主页 KPI 总览 + 反算驾驶舱快照
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>驾驶舱 API 封装对象</p>
 */
export const dashboardApi = {
  /**
   * <p>主页 KPI 总览</p>
   * @returns {Promise<Object>} 总览指标聚合
   */
  overview: () => request.get('/dashboard/overview'),

  /**
   * <p>KPI 近 N 日趋势</p>
   * @param {number} [days=14] - 天数, 默认 14
   * @returns {Promise<Array>} 趋势点序列
   */
  kpiTrend: (days = 14) => request.get('/dashboard/kpi-trend', { params: { days } }),

  /**
   * <p>方案维度的 KPI 分布</p>
   * @returns {Promise<Array>} 分布数据
   */
  schemeDistribution: () => request.get('/dashboard/scheme-distribution'),

  /**
   * <p>Top KPI 排行 (按口径/方案)</p>
   * @returns {Promise<Array>} Top KPI 列表
   */
  topKpis: () => request.get('/dashboard/top-kpis'),

  // PRD 风格反算驾驶舱

  /**
   * <p>PRD 风格反算驾驶舱 (方案×Run×日期的快照汇总)</p>
   * @param {Object} [params={}] - { schemeCode, runId, dataDate }
   * @returns {Promise<Object>} 反算驾驶舱快照
   */
  reverseOverview: (params = {}) => request.get('/dashboard/reverse-overview', { params })
}