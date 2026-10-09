/**
 * @file 反算驾驶舱 (Reverse Dashboard) API 封装
 * @desc 对应后端 com.prcp.business.reverse.ReverseDashboardController
 *       提供反算驾驶舱页面的 options/runs/dates/snapshot 拉取
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>反算驾驶舱 API 封装对象</p>
 */
export const reverseDashboardApi = {
  /**
   * <p>查询反算驾驶舱下拉选项 (方案/Run/日期)</p>
   * @returns {Promise<Object>} 选项列表
   */
  options: () => request.get('/reverse-dashboard/options'),

  /**
   * <p>查询某方案下的 Run 列表 (驾驶舱用)</p>
   * @param {string} schemeCode - 方案编码
   * @returns {Promise<Array>} Run 列表
   */
  runs: (schemeCode) => request.get('/reverse-dashboard/runs', { params: { scheme_code: schemeCode } }),

  /**
   * <p>查询某方案某 Run 下的有效数据日期</p>
   * @param {string} schemeCode - 方案编码
   * @param {number|string} runId - Run ID
   * @returns {Promise<string[]>} yyyy-MM-dd 字符串数组
   */
  dates: (schemeCode, runId) => request.get('/reverse-dashboard/dates', { params: { scheme_code: schemeCode, run_id: runId } }),

  /**
   * <p>查询反算驾驶舱快照 (某 Run 某日期的关键指标)</p>
   * @param {Object} params - { schemeCode, runId, dataDate }
   * @returns {Promise<Object>} 快照结果
   */
  snapshot: (params) => request.get('/reverse-dashboard/snapshot', { params })
}