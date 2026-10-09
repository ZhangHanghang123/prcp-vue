/**
 * @file 资产负债表 API 封装
 * @desc 对应后端 com.prcp.business.balance.BalanceController
 *       含按方案/日期的余额查询、矩阵查询、Gap 汇总、分类汇总、Excel 导出
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>资产负债表 API 封装对象</p>
 */
export const balanceApi = {
  /**
   * <p>分页查询余额数据</p>
   *
   * @param {Object} [params={}] - { schemeId, dataDate, keyword, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  list: (params = {}) => request.get('/balance', { params }),

  /**
   * <p>新增或更新一条余额 (upsert)</p>
   *
   * @param {Object} data - 余额实体 (含 schemeId/coaNodeId/dataDate/balance 等)
   * @returns {Promise<Object>} 持久化后的实体
   */
  upsert: (data) => request.post('/balance', data),

  /**
   * <p>按主键删除一条余额</p>
   *
   * @param {number|string} id - 主键 ID
   * @returns {Promise<void>}
   */
  delete: (id) => request.delete('/balance/' + id),

  /**
   * <p>指定日期的资产负债 Gap 汇总 (期限错配统计)</p>
   *
   * @param {string} dataDate - 数据日期 yyyy-MM-dd
   * @returns {Promise<Object>} Gap 汇总结果
   */
  gapSummary: (dataDate) => request.get('/balance/gap-summary', { params: { data_date: dataDate } }),

  /**
   * <p>按方案×节点×桶 矩阵形式查询余额 (对齐 Python)</p>
   *
   * @param {Object} params - { schemeId, dataDate }
   * @returns {Promise<Object>} 矩阵数据
   */
  bySchemeMatrix: (params) => request.get('/balance/by-scheme-matrix', { params }),

  /**
   * <p>按方案查询余额明细 (扁平列表)</p>
   *
   * @param {Object} params - { schemeId, dataDate, ... }
   * @returns {Promise<Object>} { items, total }
   */
  byScheme: (params) => request.get('/balance/by-scheme', { params }),

  /**
   * <p>查询某方案下所有有余额的数据日期</p>
   *
   * @param {number|string} schemeId - 方案 ID
   * @returns {Promise<string[]>} yyyy-MM-dd 字符串数组
   */
  dates: (schemeId) => request.get('/balance/dates', { params: { scheme_id: schemeId } }),

  /**
   * <p>按科目大类汇总余额</p>
   *
   * @param {Object} params - { schemeId, dataDate, category }
   * @returns {Promise<Object>} 分类汇总
   */
  categorySummary: (params) => request.get('/balance/category-summary', { params }),

  /**
   * <p>拼装 Excel 导出 URL (前端 fetch + blob 下载)</p>
   *
   * @param {number|string} schemeId - 方案 ID
   * @param {string} startDate - 开始日期 yyyy-MM-dd
   * @param {string} endDate - 结束日期 yyyy-MM-dd
   * @returns {string} GET 形式的 URL
   */
  exportXlsxUrl: (schemeId, startDate, endDate) => `/balance/export-xlsx?scheme_id=${schemeId}&start_date=${startDate}&end_date=${endDate}`
}