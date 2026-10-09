/**
 * @file 新业务模拟 (Sim) API 封装
 * @desc 对应后端 com.prcp.business.sim.SimController
 *       含账户册引用、模拟方案 CRUD、节点配置/期限占比
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>新业务模拟 API 封装对象</p>
 */
export const simApi = {
  // ========== 账户册 (coa) 引用 ==========

  /**
   * <p>查询可用的账户册方案 (下拉)</p>
   * @returns {Promise<Array>} 账户册方案列表
   */
  coaSchemes: () => request.get('/sim/coa-schemes'),

  /**
   * <p>查询某账户册方案的节点树</p>
   * @param {number|string} coaSchemeId - 账户册方案 ID
   * @returns {Promise<Array>} 节点树
   */
  coaTree: (coaSchemeId) => request.get('/sim/coa-tree', { params: { coa_scheme_id: coaSchemeId } }),

  /**
   * <p>查询模拟方案树 (方案×节点的虚拟配置)</p>
   * @param {number|string} coaSchemeId - 账户册方案 ID
   * @returns {Promise<Array>} 模拟方案树
   */
  simTree: (coaSchemeId) => request.get('/sim/tree', { params: { scheme_id: coaSchemeId } }),

  /**
   * <p>查询某账户册节点的元信息 (编码/名称/分类)</p>
   * @param {number|string} coaNodeId - 账户册节点 ID
   * @returns {Promise<Object>} 节点信息
   */
  nodeInfo: (coaNodeId) => request.get('/sim/node-info/' + coaNodeId),

  // ========== 模拟方案 ==========

  /**
   * <p>分页查询模拟方案</p>
   * @param {Object} [params={}] - { schemeName, status, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listSchemes: (params = {}) => request.get('/sim/schemes', { params }),

  /**
   * <p>创建模拟方案</p>
   * @param {Object} data - 方案实体
   * @returns {Promise<Object>} 新建方案
   */
  createScheme: (data) => request.post('/sim/schemes', data),

  /**
   * <p>更新模拟方案</p>
   * @param {number|string} id - 方案 ID
   * @param {Object} data - 新方案数据
   * @returns {Promise<Object>} 更新后方案
   */
  updateScheme: (id, data) => request.put('/sim/schemes/' + id, data),

  /**
   * <p>切换模拟方案启停状态</p>
   * @param {number|string} id - 方案 ID
   * @param {string} status - 目标状态 (ENABLED/DISABLED)
   * @returns {Promise<void>}
   */
  toggleStatus: (id, status) => request.patch('/sim/schemes/' + id + '/status', { status }),

  /**
   * <p>删除模拟方案</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<void>}
   */
  removeScheme: (id) => request.delete('/sim/schemes/' + id),

  // ========== 节点配置 + 期限占比 ==========

  /**
   * <p>查询某方案某节点的配置 (含期限占比)</p>
   * @param {number|string} schemeId - 模拟方案 ID
   * @param {number|string} coaNodeId - 账户册节点 ID
   * @returns {Promise<Object>} 节点配置
   */
  getNodeConfig: (schemeId, coaNodeId) => request.get('/sim/node-config', { params: { scheme_id: schemeId, coa_node_id: coaNodeId } }),

  /**
   * <p>查询模拟方案下某节点的完整快照</p>
   * @param {number|string} schemeId - 模拟方案 ID
   * @param {number|string} coaNodeId - 账户册节点 ID
   * @returns {Promise<Object>} 节点快照
   */
  getSchemeNode: (schemeId, coaNodeId) => request.get(`/sim/schemes/${schemeId}/nodes/${coaNodeId}`),

  /**
   * <p>保存单节点配置 (含期限占比)</p>
   * @param {number|string} schemeId - 模拟方案 ID
   * @param {Object} data - 配置 (含 coaNodeId + 期限占比列表)
   * @returns {Promise<Object>} 保存结果
   */
  saveNodeConfig: (schemeId, data) => request.post('/sim/node-config?scheme_id=' + schemeId, data),

  /**
   * <p>批量保存某方案下所有节点配置</p>
   * @param {number|string} schemeId - 模拟方案 ID
   * @param {Object} data - 配置列表
   * @returns {Promise<Object>} 保存结果
   */
  saveSchemeAll: (schemeId, data) => request.post('/sim/schemes/' + schemeId + '/save', data),

  /**
   * <p>校验模拟方案配置 (约束/比例/期限)</p>
   * @param {number|string} schemeId - 模拟方案 ID
   * @param {Object} [data] - 额外校验参数 (可选)
   * @returns {Promise<Object>} 校验结果 { valid, errors }
   */
  validateScheme: (schemeId, data) => request.post('/sim/schemes/' + schemeId + '/validate', data || {}),

  /**
   * <p>删除某节点的配置 (级联删除期限占比)</p>
   * @param {number|string} cfgId - 配置 ID
   * @returns {Promise<void>}
   */
  removeNodeConfig: (cfgId) => request.delete('/sim/node-config/' + cfgId),

  // ========== 期限占比直接 CRUD (对齐 Python /sim/term-ratios) ==========

  /**
   * <p>查询某方案某节点下的期限占比列表</p>
   * @param {number|string} schemeId - 模拟方案 ID
   * @param {number|string} coaNodeId - 账户册节点 ID
   * @returns {Promise<Array>} 期限占比列表
   */
  listTermRatios: (schemeId, coaNodeId) => request.get('/sim/term-ratios', { params: { scheme_id: schemeId, coa_node_id: coaNodeId } }),

  /**
   * <p>更新单个期限占比记录</p>
   * @param {number|string} rid - 期限占比记录 ID
   * @param {Object} data - 新数据 (含 tenor/ratio ...)
   * @returns {Promise<Object>} 更新结果
   */
  updateTermRatio: (rid, data) => request.put('/sim/term-ratios/' + rid, data),

  /**
   * <p>删除单条期限占比记录</p>
   * @param {number|string} rid - 期限占比记录 ID
   * @returns {Promise<void>}
   */
  deleteTermRatio: (rid) => request.delete('/sim/term-ratios/' + rid)
}