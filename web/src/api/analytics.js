/**
 * 数据分析 API 接口文件
 */
import request from '@/utils/request'

/**
 * 获取用户活跃度统计
 * @param {Number} days - 天数
 * @returns {Promise}
 */
export function getUserActivity(days = 7) {
  return request({
    url: '/api/analytics/user-activity',
    method: 'get',
    params: { days }
  })
}

/**
 * 获取商品浏览量排行
 * @param {Number} limit - 限制数量
 * @returns {Promise}
 */
export function getProductViews(limit = 10) {
  return request({
    url: '/api/analytics/product-views',
    method: 'get',
    params: { limit }
  })
}

/**
 * 获取分类浏览量排行
 * @returns {Promise}
 */
export function getCategoryViews() {
  return request({
    url: '/api/analytics/category-views',
    method: 'get'
  })
}

/**
 * 获取销售额统计
 * @param {Number} days - 天数
 * @returns {Promise}
 */
export function getSalesStats(days = 30) {
  return request({
    url: '/api/analytics/sales',
    method: 'get',
    params: { days }
  })
}

/**
 * 获取商品销量排行
 * @param {Number} limit - 限制数量
 * @returns {Promise}
 */
export function getProductSales(limit = 10) {
  return request({
    url: '/api/analytics/product-sales',
    method: 'get',
    params: { limit }
  })
}

/**
 * 获取用户购买力排行
 * @param {Number} limit - 限制数量
 * @returns {Promise}
 */
export function getUserPurchases(limit = 10) {
  return request({
    url: '/api/analytics/user-purchases',
    method: 'get',
    params: { limit }
  })
}

/**
 * 获取商品浏览统计
 * @param {Number} productId - 商品ID
 * @returns {Promise}
 */
export function getProductViewStats(productId) {
  return request({
    url: `/api/logs/products/stats/product/${productId}`,
    method: 'get'
  })
}

/**
 * 获取分类浏览统计
 * @param {Number} categoryId - 分类ID
 * @returns {Promise}
 */
export function getCategoryViewStats(categoryId) {
  return request({
    url: `/api/logs/products/stats/category/${categoryId}`,
    method: 'get'
  })
}

/**
 * 获取商品购买统计
 * @param {Number} productId - 商品ID
 * @returns {Promise}
 */
export function getProductPurchaseStats(productId) {
  return request({
    url: `/api/logs/purchases/stats/product/${productId}`,
    method: 'get'
  })
}

/**
 * 获取用户登录历史
 * @param {Number} userId - 用户ID
 * @returns {Promise}
 */
export function getUserLoginHistory(userId) {
  return request({
    url: `/api/logs/users/${userId}`,
    method: 'get'
  })
}

/**
 * 获取用户购买历史
 * @param {Number} userId - 用户ID
 * @returns {Promise}
 */
export function getUserPurchaseHistory(userId) {
  return request({
    url: `/api/logs/purchases/user/${userId}`,
    method: 'get'
  })
}

/**
 * 获取管理员操作日志
 * @param {Number} adminId - 管理员ID
 * @returns {Promise}
 */
export function getAdminLogs(adminId) {
  return request({
    url: `/api/logs/admins/${adminId}`,
    method: 'get'
  })
}

/**
 * 获取所有管理员操作日志
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getAllAdminLogs(params) {
  return request({
    url: '/api/logs/admins',
    method: 'get',
    params
  })
}

/**
 * 获取操作统计
 * @returns {Promise}
 */
export function getOperationStats() {
  return request({
    url: '/api/logs/admins/stats/operations',
    method: 'get'
  })
}

export default {
  getUserActivity,
  getProductViews,
  getCategoryViews,
  getSalesStats,
  getProductSales,
  getUserPurchases,
  getProductViewStats,
  getCategoryViewStats,
  getProductPurchaseStats,
  getUserLoginHistory,
  getUserPurchaseHistory,
  getAdminLogs,
  getAllAdminLogs,
  getOperationStats
}
