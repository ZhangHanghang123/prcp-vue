/**
 * @file 利率曲线 API 封装
 * @desc 对应后端 com.prcp.business.rate.RateController
 *       含曲线方案 CRUD、利率点 CRUD、利率查询/对比、Svensson/NS/NSS 拟合、CSV 导出
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>利率曲线 API 封装对象</p>
 */
export const rateApi = {
  // ========== 曲线方案 ==========

  /**
   * <p>分页查询利率曲线方案</p>
   * @param {Object} [params={}] - { schemeName, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listSchemes: (params = {}) => request.get('/rate/schemes', { params }),

  /**
   * <p>创建利率曲线方案</p>
   * @param {Object} data - 方案实体
   * @returns {Promise<Object>} 新建方案
   */
  createScheme: (data) => request.post('/rate/schemes', data),

  /**
   * <p>更新利率曲线方案</p>
   * @param {number|string} id - 方案 ID
   * @param {Object} data - 新方案数据
   * @returns {Promise<Object>} 更新后方案
   */
  updateScheme: (id, data) => request.put('/rate/schemes/' + id, data),

  /**
   * <p>删除利率曲线方案</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<void>}
   */
  removeScheme: (id) => request.delete('/rate/schemes/' + id),

  // ========== 利率点 ==========

  /**
   * <p>分页查询利率点</p>
   * @param {Object} [params={}] - { schemeId, tenor, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listPoints: (params = {}) => request.get('/rate/points', { params }),

  /**
   * <p>新增或更新一个利率点 (upsert)</p>
   * @param {Object} data - 利率点实体 (含 schemeId/tenor/rate ...)
   * @returns {Promise<Object>} 持久化结果
   */
  upsertPoint: (data) => request.post('/rate/points', data),

  /**
   * <p>删除一个利率点</p>
   * @param {number|string} id - 利率点 ID
   * @returns {Promise<void>}
   */
  removePoint: (id) => request.delete('/rate/points/' + id),

  // ========== 查询/对比 ==========

  /**
   * <p>按期限查找利率 (单点查询)</p>
   * @param {Object} [params={}] - { schemeId, tenor, dataDate }
   * @returns {Promise<Object>} { rate }
   */
  lookup: (params = {}) => request.get('/rate/lookup', { params }),

  /**
   * <p>对比多条曲线在指定期限的利率</p>
   * @param {Object} [params={}] - { schemeIds:[], tenor }
   * @returns {Promise<Object>} 对比结果
   */
  compare: (params = {}) => request.get('/rate/compare', { params }),

  // ========== Svensson / NS / NSS 拟合 ==========

  /**
   * <p>Svensson 模型拟合 (4 参数 + 2 衰减)</p>
   * @param {Object} data - 利率点数据
   * @returns {Promise<Object>} 拟合参数 (β0..β3, λ1, λ2)
   */
  fitSvensson: (data) => request.post('/rate/svensson', data),

  /**
   * <p>Nelson-Siegel 模型拟合 (3 参数)</p>
   * @param {Object} data - 利率点数据
   * @returns {Promise<Object>} 拟合参数 (β0..β2, λ)
   */
  fitNS: (data) => request.post('/rate/ns', data),

  /**
   * <p>Nelson-Siegel-Svensson 模型拟合 (6 参数, 同 Svensson 命名)</p>
   * @param {Object} data - 利率点数据
   * @returns {Promise<Object>} 拟合参数
   */
  fitNSS: (data) => request.post('/rate/nss', data),

  // ========== CSV 导出 ==========

  /**
   * <p>导出利率为 CSV (返回 blob)</p>
   * @param {Object} [params={}] - { schemeId, startDate, endDate }
   * @returns {Promise<Blob>} csv 文件流
   */
  exportRates: (params = {}) => request.get('/rate/export', { params, responseType: 'blob' })
}