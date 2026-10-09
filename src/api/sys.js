/**
 * @file 系统管理 API 封装
 * @desc 对应后端
 *       - com.prcp.admin.AdminController     (用户/审计/登录日志/统计)
 *       - com.prcp.admin.RoleController      (角色)
 *       - com.prcp.dict.DictController       (字典/字典项)
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>系统管理 - 用户/审计/监控 API</p>
 */
export const adminApi = {
  /**
   * <p>分页查询系统用户</p>
   * @param {string} [keyword] - 关键字 (用户名/姓名)
   * @returns {Promise<Object>} { items, total }
   */
  listUsers: (keyword) => request.get('/admin/users', { params: { keyword } }),

  /**
   * <p>创建系统用户</p>
   * @param {Object} data - 用户实体 (含 username/password/roleId/...)
   * @returns {Promise<Object>} 新建用户
   */
  createUser: (data) => request.post('/admin/users', data),

  /**
   * <p>更新系统用户</p>
   * @param {number|string} id - 用户 ID
   * @param {Object} data - 新用户数据
   * @returns {Promise<Object>} 更新后用户
   */
  updateUser: (id, data) => request.put('/admin/users/' + id, data),

  /**
   * <p>删除系统用户</p>
   * @param {number|string} id - 用户 ID
   * @returns {Promise<void>}
   */
  deleteUser: (id) => request.delete('/admin/users/' + id),

  /**
   * <p>重置用户密码 (管理员操作)</p>
   * @param {number|string} id - 用户 ID
   * @param {string} password - 新密码
   * @returns {Promise<void>}
   */
  resetPassword: (id, password) => request.post('/admin/users/' + id + '/reset-password', { password }),

  // ========== 操作日志 ==========

  /**
   * <p>分页查询操作日志 (审计)</p>
   * @param {Object} [params] - { userId, module, opType, startDate, endDate, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listOpLogs: (params) => request.get('/admin/audit-logs', { params }),

  /**
   * <p>写入一条操作日志 (前端兜底)</p>
   * @param {Object} data - 日志实体
   * @returns {Promise<Object>} 写入结果
   */
  writeOpLog: (data) => request.post('/admin/audit-logs', data),

  // ========== 登录日志 ==========

  /**
   * <p>分页查询登录日志</p>
   * @param {Object} [params] - { userId, ip, result, startDate, endDate, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  listLoginLogs: (params) => request.get('/admin/login-logs', { params }),

  /**
   * <p>写入一条登录日志</p>
   * @param {Object} data - 登录日志实体
   * @returns {Promise<Object>} 写入结果
   */
  writeLoginLog: (data) => request.post('/admin/login-logs', data),

  // ========== Dashboard 统计 ==========

  /**
   * <p>查询管理 Dashboard 统计 (用户/登录/审计计数)</p>
   * @returns {Promise<Object>} 统计结果
   */
  stats: () => request.get('/admin/stats')
}

/**
 * <p>系统管理 - 角色 API</p>
 */
export const roleApi = {
  /**
   * <p>查询所有角色 (下拉)</p>
   * @returns {Promise<Array>} 角色列表
   */
  list: () => request.get('/admin/roles'),

  /**
   * <p>创建角色</p>
   * @param {Object} data - 角色实体 (含 roleName/permissions ...)
   * @returns {Promise<Object>} 新建角色
   */
  create: (data) => request.post('/admin/roles', data),

  /**
   * <p>更新角色</p>
   * @param {number|string} id - 角色 ID
   * @param {Object} data - 新角色数据
   * @returns {Promise<Object>} 更新后角色
   */
  update: (id, data) => request.put('/admin/roles/' + id, data),

  /**
   * <p>删除角色</p>
   * @param {number|string} id - 角色 ID
   * @returns {Promise<void>}
   */
  remove: (id) => request.delete('/admin/roles/' + id)
}

/**
 * <p>系统管理 - 字典 API</p>
 */
export const dictApi = {
  /**
   * <p>查询所有字典 (扁平)</p>
   * @param {string} [keyword] - 关键字
   * @returns {Promise<Array>} 字典列表
   */
  list: (keyword) => request.get('/dict/all', { params: { keyword } }),

  /**
   * <p>按类型查询字典</p>
   * @param {string} type - 字典类型
   * @param {string} [keyword] - 关键字
   * @returns {Promise<Array>} 字典列表
   */
  listByType: (type, keyword) => request.get('/dict/' + type, { params: { keyword } }),

  /**
   * <p>查询所有字典类型 (下拉)</p>
   * @returns {Promise<Array>} 字典类型列表
   */
  listTypes: () => request.get('/dict/types'),

  /**
   * <p>查询所有字典类型及汇总 (含每类型下条数)</p>
   * @returns {Promise<Array>} 汇总列表
   */
  listTypesSummary: () => request.get('/dict/types/summary'),

  /**
   * <p>创建字典</p>
   * @param {Object} data - 字典实体
   * @returns {Promise<Object>} 新建字典
   */
  create: (data) => request.post('/dict', data),

  /**
   * <p>更新字典</p>
   * @param {number|string} id - 字典 ID
   * @param {Object} data - 新字典数据
   * @returns {Promise<Object>} 更新后字典
   */
  update: (id, data) => request.put('/dict/' + id, data),

  /**
   * <p>删除字典</p>
   * @param {number|string} id - 字典 ID
   * @returns {Promise<void>}
   */
  remove: (id) => request.delete('/dict/' + id),

  /**
   * <p>查询某字典下的所有字典项</p>
   * @param {number|string} dictId - 字典 ID
   * @returns {Promise<Array>} 字典项列表
   */
  listItems: (dictId) => request.get('/dict/' + dictId + '/items'),

  /**
   * <p>新增字典项</p>
   * @param {number|string} dictId - 字典 ID
   * @param {Object} data - 字典项实体
   * @returns {Promise<Object>} 新建字典项
   */
  createItem: (dictId, data) => request.post('/dict/' + dictId + '/items', data),

  /**
   * <p>更新字典项</p>
   * @param {number|string} itemId - 字典项 ID
   * @param {Object} data - 新字典项数据
   * @returns {Promise<Object>} 更新后字典项
   */
  updateItem: (itemId, data) => request.put('/dict/items/' + itemId, data),

  /**
   * <p>删除字典项</p>
   * @param {number|string} itemId - 字典项 ID
   * @returns {Promise<void>}
   */
  deleteItem: (itemId) => request.delete('/dict/items/' + itemId)
}