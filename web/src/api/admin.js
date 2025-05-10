/**
 * 管理员 API 接口文件
 * 用于管理后台
 */
import request from '@/utils/request'

// ==================== 用户管理 ====================

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getUserList(params) {
  return request({
    url: '/api/auth/users/',
    method: 'get',
    params
  })
}

/**
 * 创建用户
 * @param {Object} data - 用户数据
 * @returns {Promise}
 */
export function createUser(data) {
  return request({
    url: '/api/auth/users/',
    method: 'post',
    data
  })
}

/**
 * 更新用户
 * @param {Number} userId - 用户ID
 * @param {Object} data - 用户数据
 * @returns {Promise}
 */
export function updateUser(userId, data) {
  return request({
    url: `/api/auth/users/${userId}/`,
    method: 'put',
    data
  })
}

/**
 * 删除用户
 * @param {Number} userId - 用户ID
 * @returns {Promise}
 */
export function deleteUser(userId) {
  return request({
    url: `/api/auth/users/${userId}/`,
    method: 'delete'
  })
}

// ==================== 商品管理 ====================

/**
 * 获取商品列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getProductList(params) {
  return request({
    url: '/api/products/',
    method: 'get',
    params
  })
}

/**
 * 创建商品
 * @param {Object} data - 商品数据
 * @returns {Promise}
 */
export function createProduct(data) {
  return request({
    url: '/api/products/',
    method: 'post',
    data
  })
}

/**
 * 更新商品
 * @param {Number} productId - 商品ID
 * @param {Object} data - 商品数据
 * @returns {Promise}
 */
export function updateProduct(productId, data) {
  return request({
    url: `/api/products/${productId}/`,
    method: 'put',
    data
  })
}

/**
 * 删除商品
 * @param {Number} productId - 商品ID
 * @returns {Promise}
 */
export function deleteProduct(productId) {
  return request({
    url: `/api/products/${productId}/`,
    method: 'delete'
  })
}

/**
 * 批量删除商品
 * @param {String} ids - 逗号分隔的商品ID列表
 * @returns {Promise}
 */
export function batchDeleteProducts(ids) {
  // 如果只有一个ID，则使用单个删除API
  if (ids.indexOf(',') === -1) {
    return request({
      url: `/api/products/${ids}/`,
      method: 'delete'
    });
  }
  
  // 多个ID使用批量删除API
  return request({
    url: '/api/products/bulk-delete/',
    method: 'delete',
    data: {
      ids: ids
    }
  });
}

// ==================== 分类管理 ====================

/**
 * 获取分类列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCategoryList(params) {
  return request({
    url: '/api/categories/',
    method: 'get',
    params
  })
}

/**
 * 创建分类
 * @param {Object} data - 分类数据
 * @returns {Promise}
 */
export function createCategory(data) {
  return request({
    url: '/api/categories/',
    method: 'post',
    data
  })
}

/**
 * 更新分类
 * @param {Number} categoryId - 分类ID
 * @param {Object} data - 分类数据
 * @returns {Promise}
 */
export function updateCategory(categoryId, data) {
  return request({
    url: `/api/categories/${categoryId}/`,
    method: 'put',
    data
  })
}

/**
 * 删除分类
 * @param {Number} categoryId - 分类ID
 * @returns {Promise}
 */
export function deleteCategory(categoryId) {
  return request({
    url: `/api/categories/${categoryId}/`,
    method: 'delete'
  })
}

// ==================== 订单管理 ====================

/**
 * 获取订单列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getOrderList(params) {
  return request({
    url: '/api/orders/',
    method: 'get',
    params
  })
}

/**
 * 获取订单详情
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderDetail(orderId) {
  return request({
    url: `/api/orders/${orderId}/`,
    method: 'get'
  })
}

/**
 * 更新订单状态
 * @param {Number} orderId - 订单ID
 * @param {String} status - 新状态
 * @returns {Promise}
 */
export function updateOrderStatus(orderId, status) {
  return request({
    url: `/api/orders/${orderId}/status`,
    method: 'put',
    data: { status }
  })
}

/**
 * 删除订单
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function deleteOrder(orderId) {
  return request({
    url: `/api/orders/${orderId}/`,
    method: 'delete'
  })
}

// ==================== 数据分析 ====================

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

export default {
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  getProductList,
  createProduct,
  updateProduct,
  deleteProduct,
  batchDeleteProducts,
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  getOrderList,
  getOrderDetail,
  updateOrderStatus,
  deleteOrder,
  getUserActivity,
  getProductViews,
  getSalesStats,
  getProductSales,
  getAdminLogs,
  getAllAdminLogs
}
