import request from '@/utils/request'

/**
 * 获取销售业绩概览数据
 * @param {Object} params - 查询参数，包括日期范围和商户ID
 * @returns {Promise}
 */
export function getOverview(params = {}) {
  return request({
    url: '/api/admin/sales-performance/overview',
    method: 'get',
    params
  })
}

/**
 * 获取销售趋势数据
 * @param {Object} params - 查询参数，包括日期范围、商户ID和时间间隔
 * @returns {Promise}
 */
export function getTrends(params = {}) {
  return request({
    url: '/api/admin/sales-performance/trends',
    method: 'get',
    params
  })
}

/**
 * 获取商户销售业绩列表
 * @param {Object} params - 查询参数，包括日期范围、分页和排序
 * @returns {Promise}
 */
export function getMerchants(params = {}) {
  return request({
    url: '/api/admin/sales-performance/merchants',
    method: 'get',
    params
  })
}

/**
 * 获取商户销售详情
 * @param {Number} id - 商户ID
 * @param {Object} params - 查询参数，包括日期范围
 * @returns {Promise}
 */
export function getMerchantDetail(id, params = {}) {
  return request({
    url: `/api/admin/sales-performance/merchants/${id}`,
    method: 'get',
    params
  })
}

/**
 * 获取所有商户列表（用于下拉选择）
 * @returns {Promise}
 */
export function getAllMerchants() {
  return request({
    url: '/api/admin/merchants',
    method: 'get',
    params: {
      page_size: 100 // 获取所有商户
    }
  })
}

export default {
  getOverview,
  getTrends,
  getMerchants,
  getMerchantDetail,
  getAllMerchants
}
