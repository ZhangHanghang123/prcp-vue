/**
 * @file 反算结果 (Reverse Result) API 封装
 * @desc 对应后端 com.prcp.business.reverse.ReverseResultController
 *       提供反算结果浏览 (方案/Run/日期/矩阵/分类汇总/导出)
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>反算结果 API 封装对象</p>
 */
export const reverseResultApi = {
  /**
   * <p>查询反算方案列表 (结果页面用, 下拉)</p>
   * @returns {Promise<Array>} 方案列表
   */
  schemes: () => request.get('/reverse-result/schemes'),

  /**
   * <p>分页查询 Run 列表 (结果页面用)</p>
   * @param {Object} [params={}] - { schemeCode, status, page, size }
   * @returns {Promise<Object>} { items, total }
   */
  runs: (params = {}) => request.get('/reverse-result/runs', { params }),

  /**
   * <p>查询某 Run 下的有效日期</p>
   * @param {Object} [params={}] - { schemeCode, runId }
   * @returns {Promise<string[]>} yyyy-MM-dd 字符串数组
   */
  dates: (params = {}) => request.get('/reverse-result/dates', { params }),

  /**
   * <p>按方案 × 节点 × 桶 矩阵形式查询反算结果</p>
   * @param {Object} [params={}] - { schemeCode, runId, dataDate }
   * @returns {Promise<Object>} 矩阵结果
   */
  bySchemeMatrix: (params = {}) => request.get('/reverse-result/by-scheme-matrix', { params }),

  /**
   * <p>按科目大类汇总反算结果</p>
   * @param {Object} [params={}] - { schemeCode, runId, dataDate, category }
   * @returns {Promise<Object>} 分类汇总
   */
  categorySummary: (params = {}) => request.get('/reverse-result/category-summary', { params }),

  /**
   * <p>拼装反算结果 Excel 导出 URL (GET, 返回 blob)</p>
   * @param {Object} [params={}] - 过滤参数 (schemeCode/runId/dataDate/...)
   * @returns {string} GET URL
   */
  exportXlsxUrl: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return '/reverse-result/export-xlsx' + (qs ? '?' + qs : '')
  }
}