/**
 * @file 计量参数补录 API 封装 (6 个模块统一封装)
 * @desc 对应后端
 *       - com.prcp.business.params.cet1.Cet1ParamController
 *       - com.prcp.business.params.lcr.LcrParamController
 *       - com.prcp.business.params.nim.NimParamController
 *       - com.prcp.business.params.nsfr.NsfrParamController
 *       - com.prcp.business.params.roe.RoeParamController
 *       - com.prcp.business.params.eve.EveParamController
 *
 *       通用端点: /{prefix}-param (list/options/create/{id} DELETE/{id} PUT)
 *
 * @author zhanghh
 * @since 2026-10-09
 */
import request from './request'

/**
 * <p>按 prefix 构造一组通用补录 API 对象</p>
 *
 * @param {string} prefix - 端点前缀 (cet1 / lcr / nim / nsfr / roe / eve)
 * @returns {Object} { list, options, create, update, remove }
 */
function buildApi(prefix) {
  return {
    /**
     * <p>分页查询参数列表</p>
     * @param {Object} [params={}] - { schemeId, nodeId, dataDate, keyword, page, size }
     * @returns {Promise<Object>} { items, total }
     */
    list: (params = {}) => request.get(`/${prefix}-param`, { params }),

    /**
     * <p>查询下拉选项 (方案/节点/数据日期)</p>
     * @returns {Promise<Object>} 选项
     */
    options: () => request.get(`/${prefix}-param/options`),

    /**
     * <p>新增参数</p>
     * @param {Object} data - 参数实体
     * @returns {Promise<Object>} 新建参数
     */
    create: (data) => request.post(`/${prefix}-param`, data),

    /**
     * <p>更新参数</p>
     * @param {number|string} id - 参数 ID
     * @param {Object} data - 新参数数据
     * @returns {Promise<Object>} 更新后参数
     */
    update: (id, data) => request.put(`/${prefix}-param/${id}`, data),

    /**
     * <p>删除参数</p>
     * @param {number|string} id - 参数 ID
     * @returns {Promise<void>}
     */
    remove: (id) => request.delete(`/${prefix}-param/${id}`)
  }
}

/**
 * <p>CET1 (资本充足率) 参数补录 API</p>
 * @type {Object}
 */
export const cet1ParamApi = buildApi('cet1')

/**
 * <p>LCR (流动性覆盖率) 参数补录 API</p>
 * @type {Object}
 */
export const lcrParamApi = buildApi('lcr')

/**
 * <p>NIM (净息差) 参数补录 API</p>
 * @type {Object}
 */
export const nimParamApi = buildApi('nim')

/**
 * <p>NSFR (净稳定资金比例) 参数补录 API</p>
 * @type {Object}
 */
export const nsfrParamApi = buildApi('nsfr')

/**
 * <p>ROE (净资产收益率) 参数补录 API</p>
 * @type {Object}
 */
export const roeParamApi = buildApi('roe')

/**
 * <p>EVE (经济价值变动) 参数补录 API</p>
 * @type {Object}
 */
export const eveParamApi = buildApi('eve')