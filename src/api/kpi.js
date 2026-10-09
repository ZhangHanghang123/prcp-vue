/**
 * @file KPI 指标 API 封装
 * @desc 对应后端 com.prcp.business.kpi.KpiController
 *       含方案 CRUD、指标定义 CRUD、指标值 CRUD、重新计算、评分规则 CRUD、报表项关联
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>KPI 指标 API 封装对象</p>
 */
export const kpiApi = {
  // ========== 方案 ==========

  /**
   * <p>分页查询 KPI 方案</p>
   * @returns {Promise<Object>} { items, total }
   */
  listSchemes: () => request.get('/kpi/schemes'),

  /**
   * <p>查询所有 KPI 方案 (不分页, 用于下拉)</p>
   * @returns {Promise<Array>} 方案列表
   */
  listSchemesAll: () => request.get('/kpi/schemes/all'),

  /**
   * <p>创建 KPI 方案</p>
   * @param {Object} data - 方案实体
   * @returns {Promise<Object>} 新建方案
   */
  createScheme: (data) => request.post('/kpi/schemes', data),

  /**
   * <p>更新 KPI 方案</p>
   * @param {number|string} id - 方案 ID
   * @param {Object} data - 新方案数据
   * @returns {Promise<Object>} 更新后方案
   */
  updateScheme: (id, data) => request.put(`/kpi/schemes/${id}`, data),

  /**
   * <p>删除 KPI 方案</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<void>}
   */
  deleteScheme: (id) => request.delete(`/kpi/schemes/${id}`),

  // ========== 指标定义 ==========

  /**
   * <p>分页查询 KPI 指标定义</p>
   * @param {Object} [params={}] - { schemeId, kpiCode, keyword, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listDefs: (params = {}) => request.get('/kpi/definitions', { params }),

  /**
   * <p>创建 KPI 指标定义</p>
   * @param {Object} data - 指标定义 (含 schemeId/kpiCode/kpiName/formula ...)
   * @returns {Promise<Object>} 新建定义
   */
  createDef: (data) => request.post('/kpi/definitions', data),

  /**
   * <p>更新 KPI 指标定义</p>
   * @param {number|string} id - 指标 ID
   * @param {Object} data - 新指标定义
   * @returns {Promise<Object>} 更新后定义
   */
  updateDef: (id, data) => request.put(`/kpi/definitions/${id}`, data),

  /**
   * <p>删除 KPI 指标定义</p>
   * @param {number|string} id - 指标 ID
   * @returns {Promise<void>}
   */
  deleteDef: (id) => request.delete(`/kpi/definitions/${id}`),

  // ========== 指标值 ==========

  /**
   * <p>分页查询 KPI 指标值</p>
   * @param {Object} [params={}] - { schemeId, kpiId, dataDate, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listValues: (params = {}) => request.get('/kpi/values', { params }),

  /**
   * <p>新增一条 KPI 指标值 (手动录入)</p>
   * @param {Object} data - 指标值实体
   * @returns {Promise<Object>} 新建指标值
   */
  createValue: (data) => request.post('/kpi/values', data),

  /**
   * <p>删除一条 KPI 指标值</p>
   * @param {number|string} id - 指标值 ID
   * @returns {Promise<void>}
   */
  deleteValue: (id) => request.delete(`/kpi/values/${id}`),

  /**
   * <p>触发单个 KPI 在某日期的重算 (后端跑公式)</p>
   * @param {number|string} kpiId - 指标 ID
   * @param {string} dataDate - 数据日期 yyyy-MM-dd
   * @returns {Promise<Object>} 重算结果
   */
  recalc: (kpiId, dataDate) =>
    request.post('/kpi/recalc', null, { params: { kpi_id: kpiId, data_date: dataDate } }),

  // ========== 评分规则 ==========

  /**
   * <p>分页查询 KPI 评分规则 (阈值→分值映射)</p>
   * @param {Object} [params={}] - { schemeId, kpiId, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listScoreRules: (params = {}) => request.get('/kpi/score-rules', { params }),

  /**
   * <p>新增 KPI 评分规则</p>
   * @param {Object} data - 规则实体 (含 kpiId/min/max/score ...)
   * @returns {Promise<Object>} 新建规则
   */
  createScoreRule: (data) => request.post('/kpi/score-rules', data),

  /**
   * <p>更新 KPI 评分规则</p>
   * @param {number|string} id - 规则 ID
   * @param {Object} data - 新规则数据
   * @returns {Promise<Object>} 更新后规则
   */
  updateScoreRule: (id, data) => request.put(`/kpi/score-rules/${id}`, data),

  /**
   * <p>删除 KPI 评分规则</p>
   * @param {number|string} id - 规则 ID
   * @returns {Promise<void>}
   */
  deleteScoreRule: (id) => request.delete(`/kpi/score-rules/${id}`),

  // ========== 报表项关联 ==========

  /**
   * <p>查询某报表下的 KPI 报表项 (与 reports.items 关联)</p>
   * @param {number|string} rptId - 报表 ID
   * @returns {Promise<Array>} 报表项列表
   */
  listRptItems: (rptId) => request.get('/kpi/rpt-items', { params: { rpt_id: rptId } })
}