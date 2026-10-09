/**
 * @file 基础数据 (BasicData) API 封装
 * @desc 对应后端 com.prcp.business.basicdata.BasicDataController
 *       64 桶 BasicDataBuckets 维度下的余额/数据补录, 含按方案矩阵、导入/导出、预览
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>基础数据 API 封装对象 (对齐 Python basic-data 复数路径)</p>
 */
export const basicDataApi = {
  /**
   * <p>查询某方案下所有有基础数据的数据日期</p>
   * @param {number|string} [schemeId] - 方案 ID (可选, 不传则不按方案过滤)
   * @returns {Promise<string[]>} yyyy-MM-dd 字符串数组
   */
  dates: (schemeId) => request.get('/basic-data/dates', { params: schemeId == null ? {} : { schemeId } }),

  /**
   * <p>分页查询基础数据列表</p>
   * @param {Object} [params={}] - { schemeId, nodeId, dataDate, bucket, keyword, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  list: (params = {}) => request.get('/basic-data/list', { params }),

  /**
   * <p>账户册节点 × 桶 矩阵查询 (含按方案/日期)</p>
   * @param {Object} [params={}] - { schemeId, dataDate }
   * @returns {Promise<Object>} 矩阵结果
   */
  matrix: (params = {}) => request.get('/basic-data/matrix', { params }),

  /**
   * <p>按方案×桶+大类汇总矩阵 (对齐 Python by-scheme-matrix)</p>
   * @param {Object} [params={}] - { schemeId, dataDate }
   * @returns {Promise<Object>} 矩阵结果
   */
  bySchemeMatrix: (params = {}) => request.get('/basic-data/by-scheme-matrix', { params }),

  /**
   * <p>新增或更新一条基础数据 (upsert, 按复合主键判定)</p>
   * @param {Object} data - 基础数据实体 (含 schemeCode/nodeCode/YYYYMMDD/各 bucket 等)
   * @returns {Promise<Object>} 持久化结果
   */
  upsert: (data) => request.post('/basic-data/upsert', data),

  /**
   * <p>按主键逻辑删除一条基础数据 (软删)</p>
   * @param {number|string} id - 主键 ID
   * @returns {Promise<void>}
   */
  remove: (id) => request.delete('/basic-data/' + id),

  /**
   * <p>批量逻辑删除基础数据</p>
   * @param {Array<number|string>} ids - 主键 ID 列表, body 形式 { ids: [...] }
   * @returns {Promise<Object>} { deletedCount }
   */
  deleteBatch: (ids) => request.delete('/basic-data/delete-batch', { data: { ids } }),

  /**
   * <p>拼装 Excel 导出 URL (GET, 返回 blob)</p>
   * @param {Object} [params={}] - 过滤参数 (schemeId/dataDate/keyword ...)
   * @returns {string} GET URL, 值为空/null 的字段会被过滤
   */
  exportXlsxUrl: (params = {}) => {
    const qs = Object.entries(params).filter(([_, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    return '/basic-data/export-xlsx' + (qs ? '?' + qs : '')
  },

  /**
   * <p>从 Excel 导入基础数据</p>
   * @param {FormData} formData - multipart/form-data, 含 file 字段
   * @param {boolean} [dryRun=false] - true 时仅校验不入库
   * @returns {Promise<Object>} { inserted, updated, errors }
   */
  importXlsx: (formData, dryRun = false) => request.post('/basic-data/import-xlsx' + (dryRun ? '?dryRun=true' : ''), formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  /**
   * <p>Excel 预览 (导入前 dryRun)</p>
   * @param {FormData} formData - multipart/form-data, 含 file 字段
   * @returns {Promise<Object>} 预览结果 (行级解析 + 错误列表)
   */
  previewXlsx: (formData) => request.post('/basic-data/preview-xlsx', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}