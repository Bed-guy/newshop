import request from '@/utils/request'

/**
 * 获取销售报表概览数据
 * @param {Object} params - 查询参数，包括日期范围、商户ID和报表类型
 * @returns {Promise}
 */
export function getOverview(params = {}) {
  return request({
    url: '/api/admin/sales-report/overview',
    method: 'get',
    params
  })
}

/**
 * 获取销售趋势数据
 * @param {Object} params - 查询参数，包括日期范围、商户ID和报表类型
 * @returns {Promise}
 */
export function getTrends(params = {}) {
  return request({
    url: '/api/admin/sales-report/trends',
    method: 'get',
    params
  })
}

/**
 * 获取商品销售排行
 * @param {Object} params - 查询参数，包括日期范围、商户ID和限制数量
 * @returns {Promise}
 */
export function getProductRanking(params = {}) {
  return request({
    url: '/api/admin/sales-report/product-ranking',
    method: 'get',
    params
  })
}

/**
 * 获取商户销售排行
 * @param {Object} params - 查询参数，包括日期范围和限制数量
 * @returns {Promise}
 */
export function getMerchantRanking(params = {}) {
  return request({
    url: '/api/admin/sales-performance/merchants',
    method: 'get',
    params: {
      ...params,
      page: 1,
      limit: params.limit || 10
    }
  })
}

/**
 * 获取分类销售分布
 * @param {Object} params - 查询参数，包括日期范围和商户ID
 * @returns {Promise}
 */
export function getCategoryDistribution(params = {}) {
  return request({
    url: '/api/admin/sales-report/category-distribution',
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
  getProductRanking,
  getMerchantRanking,
  getCategoryDistribution,
  getAllMerchants
}
