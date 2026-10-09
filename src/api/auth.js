/**
 * @file 认证 API 封装
 * @desc 对应后端 com.prcp.auth.AuthController, 提供登录/登出/会话检查等认证流程
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>认证 API 封装对象</p>
 *
 * @property {Function} login   - 登录
 * @property {Function} health  - 健康检查 (POST /auth/health, 用于登录前心跳探活)
 */
export const authApi = {
  /**
   * <p>用户登录, 成功返回 Bearer Token</p>
   *
   * @param {Object} data - { username, password }
   * @returns {Promise<Object>} { token, userId, role, ... }
   */
  login: (data) => request.post('/auth/login', data),

  /**
   * <p>登录前健康检查 (无 token 探活)</p>
   *
   * @returns {Promise<Object>} { status: 'UP' }
   */
  health: () => request.post('/auth/health')
}