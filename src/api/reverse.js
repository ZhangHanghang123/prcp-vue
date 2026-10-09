/**
 * @file 反算 (Reverse) API 封装
 * @desc 对应后端 com.prcp.business.reverse.ReverseController
 *       含方案 CRUD、目标 CRUD、Run 生命周期 (list/create/start/cancel/result/logs)、算法选项
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>反算 API 封装对象</p>
 */
export const reverseApi = {
  // ========== 方案 ==========

  /**
   * <p>分页查询反算方案</p>
   * @param {Object} [params={}] - { schemeName, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listSchemes: (params = {}) => request.get('/reverse/schemes', { params }),

  /**
   * <p>查询反算方案详情</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<Object>} 方案详情
   */
  getScheme: (id) => request.get('/reverse/schemes/' + id),

  /**
   * <p>创建反算方案</p>
   * @param {Object} data - 方案实体
   * @returns {Promise<Object>} 新建方案
   */
  createScheme: (data) => request.post('/reverse/schemes', data),

  /**
   * <p>更新反算方案</p>
   * @param {number|string} id - 方案 ID
   * @param {Object} data - 新方案数据
   * @returns {Promise<Object>} 更新后方案
   */
  updateScheme: (id, data) => request.put('/reverse/schemes/' + id, data),

  /**
   * <p>删除反算方案</p>
   * @param {number|string} id - 方案 ID
   * @returns {Promise<void>}
   */
  deleteScheme: (id) => request.delete('/reverse/schemes/' + id),

  /**
   * <p>查询反算可绑定的模型下拉选项</p>
   * @returns {Promise<Array>} 模型选项
   */
  modelOptions: () => request.get('/reverse/model-options'),

  // ========== 目标 ==========

  /**
   * <p>分页查询反算目标 (KPI 期望值)</p>
   * @param {Object} [params={}] - { schemeId, kpiCode, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listTargets: (params = {}) => request.get('/reverse/targets', { params }),

  /**
   * <p>新增反算目标</p>
   * @param {Object} data - 目标实体 (含 schemeId/kpiCode/targetValue/tolerance ...)
   * @returns {Promise<Object>} 新建目标
   */
  createTarget: (data) => request.post('/reverse/targets', data),

  /**
   * <p>更新反算目标</p>
   * @param {number|string} id - 目标 ID
   * @param {Object} data - 新目标数据
   * @returns {Promise<Object>} 更新后目标
   */
  updateTarget: (id, data) => request.put('/reverse/targets/' + id, data),

  /**
   * <p>删除反算目标</p>
   * @param {number|string} id - 目标 ID
   * @returns {Promise<void>}
   */
  deleteTarget: (id) => request.delete('/reverse/targets/' + id),

  /**
   * <p>查询反算可绑定的 KPI 下拉选项</p>
   * @returns {Promise<Array>} KPI 选项
   */
  kpiOptions: () => request.get('/reverse/kpi-options'),

  // ========== Run ==========

  /**
   * <p>分页查询反算 Run 历史</p>
   * @param {Object} [params={}] - { schemeId, status, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listRuns: (params = {}) => request.get('/reverse/runs', { params }),

  /**
   * <p>创建反算 Run (配置落库, 不启动)</p>
   * @param {Object} data - Run 配置 (含 schemeId/algorithm/...)
   * @returns {Promise<Object>} 新建 Run
   */
  createRun: (data) => request.post('/reverse/runs', data),

  /**
   * <p>启动反算 Run (异步)</p>
   * @param {number|string} id - Run ID
   * @returns {Promise<void>}
   */
  startRun: (id) => request.post('/reverse/runs/' + id + '/start'),

  /**
   * <p>取消正在运行的 Run</p>
   * @param {number|string} id - Run ID
   * @returns {Promise<void>}
   */
  cancelRun: (id) => request.post('/reverse/runs/' + id + '/cancel'),

  /**
   * <p>删除 Run (仅终态可删)</p>
   * @param {number|string} id - Run ID
   * @returns {Promise<void>}
   */
  deleteRun: (id) => request.delete('/reverse/runs/' + id),

  /**
   * <p>增量拉取 Run 日志 (sinceId 游标)</p>
   * @param {number|string} id - Run ID
   * @param {number} [sinceId=0] - 上次拉到的最大日志 ID
   * @returns {Promise<Array>} 新日志行
   */
  runLogs: (id, sinceId = 0) => request.get('/reverse/runs/' + id + '/logs', { params: { since_id: sinceId } }),

  /**
   * <p>查询 Run 最终结果 (反算参数/目标达成情况)</p>
   * @param {number|string} id - Run ID
   * @returns {Promise<Object>} Run 结果
   */
  runResult: (id) => request.get('/reverse/runs/' + id + '/result'),

  // ========== 算法选项 ==========

  /**
   * <p>查询反算可用算法列表 (Newton/L-BFGS/GA 等)</p>
   * @returns {Promise<Array>} 算法列表
   */
  listAlgorithms: () => request.get('/reverse/algorithms')
}