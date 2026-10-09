/**
 * @file 计量系数 (Metric Coefficient) + 反算指标表 API 封装
 * @desc 对应后端
 *       - com.prcp.business.metric.MetricCoefficientController
 *       - com.prcp.business.reverse.ReverseMetricTableController
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>计量系数 API 封装对象</p>
 */
export const metricApi = {
  /**
   * <p>分页查询计量系数</p>
   * @param {Object} [params] - { schemeId, kpiId, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  list: (params) => request.get('/metric-coefficient', { params }),

  /**
   * <p>查询计量系数下拉选项</p>
   * @param {number|string} [schemeId] - 方案 ID, 为 null 时不传参 (避免 axios 把 null 序列化为 "null" 字符串)
   * @returns {Promise<Array>} 选项列表
   */
  options: (schemeId) => {
    const cfg = schemeId == null ? {} : { params: { schemeId } }
    return request.get('/metric-coefficient/options', cfg)
  },

  /**
   * <p>新增计量系数</p>
   * @param {Object} data - 系数实体 (含 schemeId/kpiId/coefficient ...)
   * @returns {Promise<Object>} 新建系数
   */
  create: (data) => request.post('/metric-coefficient', data),

  /**
   * <p>更新计量系数</p>
   * @param {number|string} id - 系数 ID
   * @param {Object} data - 新系数数据
   * @returns {Promise<Object>} 更新后系数
   */
  update: (id, data) => request.put('/metric-coefficient/' + id, data),

  /**
   * <p>删除计量系数</p>
   * @param {number|string} id - 系数 ID
   * @returns {Promise<void>}
   */
  remove: (id) => request.delete('/metric-coefficient/' + id)
}

/**
 * <p>反算指标表 API 封装对象 (反算结果展示用)</p>
 */
export const reverseMetricTableApi = {
  /**
   * <p>查询反算指标表</p>
   * @param {Object} [params] - { schemeCode, runId, dataDate, kpiCode }
   * @returns {Promise<Object>} 表格数据
   */
  query: (params) => request.get('/reverse-metric-table', { params }),

  /**
   * <p>查询反算指标表下拉选项 (方案/Run/日期/KPI)</p>
   * @returns {Promise<Object>} 选项列表
   */
  options: () => request.get('/reverse-metric-table/options')
}