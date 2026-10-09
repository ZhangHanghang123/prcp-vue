/**
 * @file 报表 API 封装
 * @desc 对应后端 com.prcp.business.reports.ReportsController
 *       含报表 CRUD、表项 CRUD、按月试算、指标值查询、报表预览
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>报表 API 封装对象</p>
 */
export const reportsApi = {
  /**
   * <p>分页查询报表列表</p>
   * @param {Object} [params={}] - { rptName, rptType, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  list: (params = {}) => request.get('/reports/', { params }),

  /**
   * <p>创建报表</p>
   * @param {Object} data - 报表实体
   * @returns {Promise<Object>} 新建报表
   */
  create: (data) => request.post('/reports/', data),

  /**
   * <p>更新报表</p>
   * @param {number|string} id - 报表 ID
   * @param {Object} data - 新报表数据
   * @returns {Promise<Object>} 更新后报表
   */
  update: (id, data) => request.put(`/reports/${id}`, data),

  /**
   * <p>删除报表</p>
   * @param {number|string} id - 报表 ID
   * @returns {Promise<void>}
   */
  delete: (id) => request.delete(`/reports/${id}`),

  /**
   * <p>查询某报表下的表项列表</p>
   * @param {number|string} reportId - 报表 ID
   * @returns {Promise<Array>} 表项列表
   */
  listItems: (reportId) => request.get('/reports/items', { params: { report_id: reportId } }),

  /**
   * <p>新增报表项</p>
   * @param {Object} data - 报表项实体 (含 reportId/kpiCode/rptCell ...)
   * @returns {Promise<Object>} 新建报表项
   */
  createItem: (data) => request.post('/reports/items', data),

  /**
   * <p>更新报表项</p>
   * @param {number|string} id - 报表项 ID
   * @param {Object} data - 新报表项数据
   * @returns {Promise<Object>} 更新后报表项
   */
  updateItem: (id, data) => request.put(`/reports/items/${id}`, data),

  /**
   * <p>删除报表项</p>
   * @param {number|string} id - 报表项 ID
   * @returns {Promise<void>}
   */
  deleteItem: (id) => request.delete(`/reports/items/${id}`),

  /**
   * <p>按月试算报表项 (trial-calculate)</p>
   * @param {Object} body - 试算参数 (含 reportId/数据范围)
   * @returns {Promise<Object>} 试算结果 (按月)
   */
  calcByMonth: (body) => request.post('/reports/items/calc-by-month', body),

  /**
   * <p>查询报表项的指标值</p>
   * @param {number|string} itemId - 报表项 ID
   * @param {string} dataDate - 数据日期 yyyy-MM-dd
   * @returns {Promise<Array>} 指标值列表
   */
  listValues: (itemId, dataDate) => request.get('/reports/values', { params: { item_id: itemId, data_date: dataDate } }),

  /**
   * <p>预览报表在某数据日期下的渲染结果</p>
   * @param {number|string} reportId - 报表 ID
   * @param {string} dataDate - 数据日期 yyyy-MM-dd
   * @returns {Promise<Object>} 报表渲染结果
   */
  preview: (reportId, dataDate) => request.get('/reports/preview', { params: { report_id: reportId, data_date: dataDate } })
}