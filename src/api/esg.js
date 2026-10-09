/**
 * @file 经济情景生成 (ESG) API 封装
 * @desc 对应后端 com.prcp.business.esg.EsgController
 *       含方案管理、Svensson 利率曲线、Run 历史、情景集、执行 (HJM/PCA/蒙特卡洛)
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

// ===================== 方案管理 =====================

/**
 * <p>查询 ESG 方案列表 (含分页 + 过滤)</p>
 *
 * @param {Object} [params] - { schemeName, keyword, page, size }
 * @returns {Promise<Object>} { items, total }
 */
export function listSchemes(params) {
  return request({ url: '/esg/schemes', method: 'get', params })
}

/**
 * <p>创建 ESG 方案</p>
 *
 * @param {Object} data - 方案字段
 * @returns {Promise<Object>} 新建方案
 */
export function createScheme(data) {
  return request({ url: '/esg/schemes', method: 'post', data })
}

/**
 * <p>查询 ESG 方案详情</p>
 *
 * @param {number|string} id - 方案 ID
 * @returns {Promise<Object>} 方案详情
 */
export function getScheme(id) {
  return request({ url: `/esg/schemes/${id}`, method: 'get' })
}

/**
 * <p>更新 ESG 方案</p>
 *
 * @param {number|string} id - 方案 ID
 * @param {Object} data - 新方案数据
 * @returns {Promise<Object>} 更新后方案
 */
export function updateScheme(id, data) {
  return request({ url: `/esg/schemes/${id}`, method: 'put', data })
}

/**
 * <p>软删 ESG 方案</p>
 *
 * @param {number|string} id - 方案 ID
 * @returns {Promise<void>}
 */
export function deleteScheme(id) {
  return request({ url: `/esg/schemes/${id}`, method: 'delete' })
}

/**
 * <p>克隆 ESG 方案 (复制方案及其下参数/曲线配置)</p>
 *
 * @param {number|string} id - 被克隆方案 ID
 * @param {Object} data - 新方案字段 (name/code/...)
 * @returns {Promise<Object>} 新克隆方案
 */
export function cloneScheme(id, data) {
  return request({ url: `/esg/schemes/${id}/clone`, method: 'post', data })
}

/**
 * <p>查询 ESG 缓存诊断信息 (命中率/容量)</p>
 *
 * @returns {Promise<Object>} 缓存状态
 */
export function cacheInfo() {
  return request({ url: '/esg/cache-info', method: 'get' })
}

// ===================== Svensson 曲线 =====================

/**
 * <p>分页查询利率曲线列表</p>
 *
 * @param {Object} [params] - { curveDate, source, page, size }
 * @returns {Promise<Object>} { items, total }
 */
export function listCurves(params) {
  return request({ url: '/esg/curves', method: 'get', params })
}

/**
 * <p>查询所有可用曲线来源 (source 下拉)</p>
 *
 * @returns {Promise<string[]>} 来源列表
 */
export function curveSources() {
  return request({ url: '/esg/curves/sources', method: 'get' })
}

/**
 * <p>查询某日某来源的利率曲线</p>
 *
 * @param {string} curveDate - 曲线日期 yyyy-MM-dd
 * @param {string} source - 数据来源 (例如: WIND/中债)
 * @returns {Promise<Object>} 曲线详情 (含 β0..β3, λ1, λ2)
 */
export function getCurve(curveDate, source) {
  return request({ url: `/esg/curves/${curveDate}`, method: 'get', params: { source } })
}

/**
 * <p>新增或更新一条利率曲线</p>
 *
 * @param {Object} data - 曲线实体
 * @returns {Promise<Object>} 持久化结果
 */
export function upsertCurve(data) {
  return request({ url: '/esg/curves', method: 'post', data })
}

/**
 * <p>批量 upsert 利率曲线</p>
 *
 * @param {Object|Array} data - 批量曲线数据
 * @returns {Promise<Object>} 批量结果
 */
export function bulkUpsertCurves(data) {
  return request({ url: '/esg/curves/bulk', method: 'post', data })
}

/**
 * <p>由 Svensson 参数计算指定期限的利率 (POST 形式)</p>
 *
 * @param {string} curveDate - 曲线日期 yyyy-MM-dd
 * @param {Object} data - { maturities: [0.25, 1, 5, ...] }
 * @returns {Promise<Object>} { curveDate, rates: [{ maturity, rate }, ...] }
 */
export function svenssonRates(curveDate, data) {
  return request({ url: `/esg/curves/${curveDate}/rates`, method: 'post', data })
}

// ===================== Run 历史 =====================

/**
 * <p>查询某方案下的 Run 历史</p>
 *
 * @param {number|string} schemeId - 方案 ID
 * @param {Object} [params] - { runType, status, page, size }
 * @returns {Promise<Object>} { items, total }
 */
export function listSchemeRuns(schemeId, params) {
  return request({ url: `/esg/schemes/${schemeId}/runs`, method: 'get', params })
}

/**
 * <p>查询全 Run 历史 (跨方案)</p>
 *
 * @param {Object} [params] - { schemeId, runType, status, page, size }
 * @returns {Promise<Object>} { items, total }
 */
export function listAllRuns(params) {
  return request({ url: '/esg/runs', method: 'get', params })
}

/**
 * <p>查询 Run 详情</p>
 *
 * @param {number|string} id - Run ID
 * @returns {Promise<Object>} Run 详情
 */
export function getRun(id) {
  return request({ url: `/esg/runs/${id}`, method: 'get' })
}

// ===================== 情景集 =====================

/**
 * <p>查询情景集列表</p>
 *
 * @param {Object} [params] - { code, schemeId, page, size }
 * @returns {Promise<Object>} { items, total }
 */
export function listScenarios(params) {
  return request({ url: '/esg/scenarios', method: 'get', params })
}

/**
 * <p>查询情景集详情</p>
 *
 * @param {string} code - 情景集编码
 * @returns {Promise<Object>} 情景集详情
 */
export function getScenario(code) {
  return request({ url: `/esg/scenarios/${code}`, method: 'get' })
}

/**
 * <p>查询情景集统计信息 (路径数/均值/分位数等)</p>
 *
 * @param {string} code - 情景集编码
 * @returns {Promise<Object>} 统计结果
 */
export function getScenarioStats(code) {
  return request({ url: `/esg/scenarios/${code}/stats`, method: 'get' })
}

/**
 * <p>拼装情景集下载 URL (含 baseURL)</p>
 *
 * @param {string} code - 情景集编码
 * @returns {string} 完整 GET URL, 含 /prcp-java/api 前缀
 */
export function downloadScenarioUrl(code) {
  return `/prcp-java/api/esg/scenarios/${code}/download`
}

// ===================== 执行 =====================

/**
 * <p>执行 PCA 拟合 (降维)</p>
 *
 * @param {number|string} id - 方案 ID
 * @param {Object} [data={}] - PCA 参数 { nComponents, method }
 * @returns {Promise<Object>} PCA 拟合结果
 */
export function fitPca(id, data = {}) {
  return request({ url: `/esg/schemes/${id}/fit-pca`, method: 'post', data })
}

/**
 * <p>HJM 模型生成利率路径</p>
 *
 * @param {number|string} id - 方案 ID
 * @param {Object} [data={}] - HJM 参数 { horizon, steps, vol }
 * @returns {Promise<Object>} HJM 路径生成结果
 */
export function generateHjm(id, data = {}) {
  return request({ url: `/esg/schemes/${id}/generate-hjm`, method: 'post', data })
}

/**
 * <p>蒙特卡洛生成完整情景集</p>
 *
 * @param {number|string} id - 方案 ID
 * @param {Object} [data={}] - 蒙特卡洛参数 { paths, horizon }
 * @returns {Promise<Object>} 情景集生成结果
 */
export function generateScenarios(id, data = {}) {
  return request({ url: `/esg/schemes/${id}/generate`, method: 'post', data })
}

/**
 * <p>一键执行 fit-pca → generate-hjm → generate</p>
 *
 * @param {number|string} id - 方案 ID
 * @returns {Promise<Object>} 全流程执行结果
 */
export function runAll(id) {
  return request({ url: `/esg/schemes/${id}/run-all`, method: 'post' })
}

/**
 * <p>单笔情景试算 (case run, 立即返回)</p>
 *
 * @param {Object} [data={}] - 试算参数 (利率 + 期限结构)
 * @returns {Promise<Object>} 试算结果
 */
export function caseRun(data = {}) {
  return request({ url: '/esg/case/run', method: 'post', data })
}