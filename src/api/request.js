/**
 * @file Axios HTTP 请求封装 (全局唯一实例)
 * @desc 封装 axios 实例 + 请求/响应拦截器, 处理:
 *       1. baseURL 走 VUE_APP_BASE_API 环境变量 (默认 /prcp-java/api)
 *       2. 超时 30s
 *       3. 请求拦截: 自动附加 Bearer Token
 *       4. 响应拦截: 解析后端 R<T> {code, msg, data} 格式, 401 触发重新登录
 *       5. 错误统一弹 Element UI Message
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import axios from 'axios'
import { Message, MessageBox } from 'element-ui'
import router from '@/router'
import { getToken, removeToken, removeUser } from '@/utils/auth'

/**
 * <p>全局 axios 实例</p>
 *
 * <p>关键约定:
 * <ul>
 *   <li>所有业务 API 文件通过 `import request from './request'` 引用本实例</li>
 *   <li>后端统一返回 R<T> { code, msg, data }, 本实例解包后只把 data 传给调用方</li>
 *   <li>code !== 0 && code !== 200 视为业务错误, 弹 Message 并 reject</li>
 *   <li>code === 401 弹确认框, 确认后清 token 并跳转 /login</li>
 * </ul>
 * </p>
 *
 * @type {import('axios').AxiosInstance}
 */
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 30000
})

/**
 * <p>请求拦截器: 自动从 utils/auth 取 token, 写入 Authorization 头</p>
 *
 * @param {import('axios').AxiosRequestConfig} config - 请求配置
 * @returns {import('axios').AxiosRequestConfig} 注入 token 后的配置
 */
service.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) config.headers['Authorization'] = `Bearer ${token}`
    return config
  },
  error => Promise.reject(error)
)

/**
 * <p>响应拦截器: 解包 R&lt;T&gt;, 处理业务错误码, 401 跳转登录</p>
 *
 * @returns {Promise} 仅当 code===0 或 code===200 时 resolve 后端 data
 */
service.interceptors.response.use(
  response => {
    const res = response.data
    // Java 端 R<T> 格式：{code, msg, data}
    if (res.code !== 0 && res.code !== 200) {
      Message.error(res.msg || '请求失败')
      if (res.code === 401) {
        MessageBox.confirm('登录已过期，请重新登录', '提示', { confirmButtonText: '重新登录' })
          .then(() => {
            removeToken()
            removeUser()
            router.push('/login')
          })
          .catch(() => {})
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    }
    return res.data
  },
  error => {
    console.error('[Request Error]', error)
    Message.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

/**
 * <p>默认导出: 全局 axios 实例, 业务 API 通过 request({ url, method, params/data }) 或 request.get/post 调用</p>
 */
export default service