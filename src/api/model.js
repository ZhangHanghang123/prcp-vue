/**
 * @file 模型管理 API 封装
 * @desc 对应后端 com.prcp.business.model.ModelController
 *       含算法选项/方案选项、模型 CRUD、版本 CRUD、参数 CRUD、训练 (启动/取消/日志/结果)
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>模型管理 API 封装对象</p>
 */
export const modelApi = {
  /**
   * <p>查询可用算法列表 (LR/AD/Newton/L-BFGS 等下拉)</p>
   * @returns {Promise<Array>} 算法列表
   */
  algorithms: () => request.get('/model/algorithms'),

  /**
   * <p>查询模型可绑定的方案下拉选项</p>
   * @returns {Promise<Array>} 方案列表
   */
  schemeOptions: () => request.get('/model/scheme-options'),

  // ========== 模型 ==========

  /**
   * <p>分页查询模型列表</p>
   * @param {Object} [params={}] - { modelName, algorithm, schemeId, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listModels: (params = {}) => request.get('/model/models', { params }),

  /**
   * <p>创建模型</p>
   * @param {Object} data - 模型实体 (含 modelName/algorithm/schemeId/...)
   * @returns {Promise<Object>} 新建模型
   */
  createModel: (data) => request.post('/model/models', data),

  /**
   * <p>更新模型</p>
   * @param {number|string} id - 模型 ID
   * @param {Object} data - 新模型数据
   * @returns {Promise<Object>} 更新后模型
   */
  updateModel: (id, data) => request.put('/model/models/' + id, data),

  /**
   * <p>删除模型</p>
   * @param {number|string} id - 模型 ID
   * @returns {Promise<void>}
   */
  removeModel: (id) => request.delete('/model/models/' + id),

  // ========== 版本 ==========

  /**
   * <p>分页查询模型版本</p>
   * @param {Object} [params={}] - { modelId, versionNo, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listVersions: (params = {}) => request.get('/model/versions', { params }),

  /**
   * <p>创建模型版本</p>
   * @param {Object} data - 版本实体 (含 modelId/versionNo/paramsJson ...)
   * @returns {Promise<Object>} 新建版本
   */
  createVersion: (data) => request.post('/model/versions', data),

  /**
   * <p>更新模型版本</p>
   * @param {number|string} id - 版本 ID
   * @param {Object} data - 新版本数据
   * @returns {Promise<Object>} 更新后版本
   */
  updateVersion: (id, data) => request.put('/model/versions/' + id, data),

  /**
   * <p>删除模型版本</p>
   * @param {number|string} id - 版本 ID
   * @returns {Promise<void>}
   */
  removeVersion: (id) => request.delete('/model/versions/' + id),

  /**
   * <p>克隆模型版本 (复制参数快照)</p>
   * @param {number|string} id - 版本 ID
   * @param {Object} data - 新版本号/备注
   * @returns {Promise<Object>} 新版本
   */
  copyVersion: (id, data) => request.post('/model/versions/' + id + '/copy', data),

  // ========== 参数 ==========

  /**
   * <p>分页查询模型参数</p>
   * @param {Object} [params={}] - { versionId, paramCode, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listParams: (params = {}) => request.get('/model/params', { params }),

  /**
   * <p>新增 (保存) 模型参数</p>
   * @param {Object} data - 参数实体 (含 versionId/paramCode/paramValue ...)
   * @returns {Promise<Object>} 新建参数
   */
  saveParam: (data) => request.post('/model/params', data),

  /**
   * <p>更新模型参数</p>
   * @param {number|string} id - 参数 ID
   * @param {Object} data - 新参数数据
   * @returns {Promise<Object>} 更新后参数
   */
  updateParam: (id, data) => request.put('/model/params/' + id, data),

  /**
   * <p>删除模型参数</p>
   * @param {number|string} id - 参数 ID
   * @returns {Promise<void>}
   */
  removeParam: (id) => request.delete('/model/params/' + id),

  // ========== 训练 ==========

  /**
   * <p>启动模型训练 (异步, 立即返回 trainId)</p>
   * @param {number|string} modelId - 模型 ID
   * @param {Object} data - 训练配置 (versionId/algorithm/...)
   * @returns {Promise<Object>} { trainId }
   */
  startTrain: (modelId, data) => request.post('/model/' + modelId + '/train', data),

  /**
   * <p>取消训练任务</p>
   * @param {Object} data - { trainId }
   * @returns {Promise<void>}
   */
  cancelTrain: (data) => request.post('/model/train/cancel', data),

  /**
   * <p>查询训练日志 (按 trainId 增量)</p>
   * @param {number|string} modelId - 模型 ID
   * @param {number|string} trainId - 训练任务 ID
   * @returns {Promise<Array>} 日志行列表
   */
  trainLogs: (modelId, trainId) => request.get('/model/' + modelId + '/logs', { params: { trainId } }),

  /**
   * <p>查询训练结果列表 (含指标/损失/参数)</p>
   * @param {Object} [params={}] - { modelId, versionId, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  trainResults: (params = {}) => request.get('/model/results', { params })
}