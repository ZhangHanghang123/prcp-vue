import request from './request'

// 6 个计量参数补录模块的 API 封装
// 每个模块的端点路径: /{prefix}-param
// 通用方法: list / options / create / update / delete

function buildApi(prefix) {
  return {
    list: (params = {}) => request.get(`/${prefix}-param`, { params }),
    options: () => request.get(`/${prefix}-param/options`),
    create: (data) => request.post(`/${prefix}-param`, data),
    update: (id, data) => request.put(`/${prefix}-param/${id}`, data),
    remove: (id) => request.delete(`/${prefix}-param/${id}`)
  }
}

export const cet1ParamApi = buildApi('cet1')
export const lcrParamApi = buildApi('lcr')
export const nimParamApi = buildApi('nim')
export const nsfrParamApi = buildApi('nsfr')
export const roeParamApi = buildApi('roe')
export const eveParamApi = buildApi('eve')
