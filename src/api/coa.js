/**
 * @file 账户册 (COA) API 封装
 * @desc 对应后端 com.prcp.business.coa.CoaController
 *       含方案 CRUD、节点 CRUD、Excel 导入导出
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>账户册 API 封装对象 (方案对齐 Python 复数路径)</p>
 */
export const coaApi = {
  // ========== 方案 ==========

  /**
   * <p>分页查询账户册方案</p>
   * @returns {Promise<Object>} { items, total }
   */
  listSchemes: () => request.get('/coa/schemes'),

  /**
   * <p>查询所有账户册方案 (不分页, 用于下拉)</p>
   * @returns {Promise<Array>} 方案列表
   */
  listSchemesAll: () => request.get('/coa/schemes/all'),

  /**
   * <p>查询账户册方案详情</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<Object>} 方案详情
   */
  getScheme: (id) => request.get(`/coa/schemes/${id}`),

  /**
   * <p>创建账户册方案</p>
   * @param {Object} data - 方案实体
   * @returns {Promise<Object>} 新建方案
   */
  createScheme: (data) => request.post('/coa/schemes', data),

  /**
   * <p>更新账户册方案</p>
   * @param {number|string} id - 方案 ID
   * @param {Object} data - 新方案数据
   * @returns {Promise<Object>} 更新后方案
   */
  updateScheme: (id, data) => request.put(`/coa/schemes/${id}`, data),

  /**
   * <p>删除账户册方案</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<void>}
   */
  deleteScheme: (id) => request.delete(`/coa/schemes/${id}`),

  // ========== 节点 ==========

  /**
   * <p>查询某方案下的账户册节点 (扁平列表)</p>
   * @param {number|string} schemeId - 方案 ID
   * @returns {Promise<Array>} 节点列表
   */
  listNodes: (schemeId) => request.get('/coa/nodes', { params: { scheme_id: schemeId } }),

  /**
   * <p>查询某方案下的账户册节点 (树形结构)</p>
   * @param {number|string} schemeId - 方案 ID
   * @returns {Promise<Array>} 节点树
   */
  listTree: (schemeId) => request.get('/coa/nodes/tree', { params: { scheme_id: schemeId } }),

  /**
   * <p>新增账户册节点</p>
   * @param {Object} data - 节点实体 (含 schemeId/parentCode/nodeCode/nodeName/category 等)
   * @returns {Promise<Object>} 新建节点
   */
  createNode: (data) => request.post('/coa/nodes', data),

  /**
   * <p>更新账户册节点</p>
   * @param {number|string} id - 节点 ID
   * @param {Object} data - 新节点数据
   * @returns {Promise<Object>} 更新后节点
   */
  updateNode: (id, data) => request.put(`/coa/nodes/${id}`, data),

  /**
   * <p>删除账户册节点</p>
   * @param {number|string} id - 节点 ID
   * @returns {Promise<void>}
   */
  deleteNode: (id) => request.delete(`/coa/nodes/${id}`),

  // ========== Excel 导入导出 (P1-1 已对齐) ==========

  /**
   * <p>从 Excel 导入账户册节点</p>
   * @param {FormData} formData - multipart/form-data, 含 file 字段
   * @returns {Promise<Object>} 导入结果 { inserted, updated, errors }
   */
  importExcel: (formData) => request.post('/coa/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  /**
   * <p>导出账户册为 Excel (返回 blob)</p>
   * @param {number|string} schemeId - 方案 ID
   * @returns {Promise<Blob>} xlsx 文件流
   */
  exportExcel: (schemeId) => request.get('/coa/export', { params: { scheme_id: schemeId }, responseType: 'blob' })
}