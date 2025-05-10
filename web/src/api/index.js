/**
 * 统一 API 接口文件
 * 集中管理所有接口调用
 */
import request from '@/utils/request'

// ==================== 用户认证相关接口 ====================

/**
 * 用户登录
 * @param {Object} data - 包含用户名和密码的对象
 * @returns {Promise}
 */
export function login(data) {
  return request({
    url: '/api/auth/login/',
    method: 'post',
    data
  })
}

/**
 * 用户注册
 * @param {Object} data - 包含用户名、密码和邮箱的对象
 * @returns {Promise}
 */
export function register(data) {
  return request({
    url: '/api/auth/register/',
    method: 'post',
    data: {
      username: data.username,
      password: data.password,
      email: data.email || data.username // 如果没有提供邮箱，使用用户名作为邮箱
    }
  })
}

/**
 * 用户登出
 * @returns {Promise}
 */
export function logout() {
  return request({
    url: '/api/auth/logout/',
    method: 'post'
  })
}

/**
 * 获取用户信息
 * @param {Number} userId - 用户ID
 * @returns {Promise}
 */
export function getUserInfo(userId) {
  return request({
    url: '/api/auth/users/' + userId + '/',
    method: 'get'
  })
}

/**
 * 更新用户信息
 * @param {Number} userId - 用户ID
 * @param {Object} data - 要更新的用户数据
 * @returns {Promise}
 */
export function updateUserInfo(userId, data) {
  return request({
    url: '/api/auth/users/' + userId + '/',
    method: 'put',
    data
  })
}

/**
 * 管理员登录
 * @param {Object} data - 包含用户名和密码的对象
 * @returns {Promise}
 */
export function adminLogin(data) {
  return request({
    url: '/api/auth/admin-login/',
    method: 'post',
    data
  })
}

// ==================== 商品相关接口 ====================

/**
 * 获取商品列表
 * @param {Object} params - 查询参数，如分类、搜索关键词、排序等
 * @returns {Promise}
 */
export function getProducts(params) {
  return request({
    url: '/api/products/',
    method: 'get',
    params
  })
}

/**
 * 获取商品详情
 * @param {Number} productId - 商品ID
 * @returns {Promise}
 */
export function getProductDetail(productId) {
  return request({
    url: '/api/products/' + productId + '/',
    method: 'get'
  })
}

/**
 * 创建商品（管理员）
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
 * 更新商品（管理员）
 * @param {Number} productId - 商品ID
 * @param {Object} data - 要更新的商品数据
 * @returns {Promise}
 */
export function updateProduct(productId, data) {
  return request({
    url: '/api/products/' + productId + '/',
    method: 'put',
    data
  })
}

/**
 * 删除商品（管理员）
 * @param {Number} productId - 商品ID
 * @returns {Promise}
 */
export function deleteProduct(productId) {
  return request({
    url: '/api/products/' + productId + '/',
    method: 'delete'
  })
}

/**
 * 批量删除商品（管理员）
 * @param {String} ids - 逗号分隔的商品ID列表
 * @returns {Promise}
 */
export function batchDeleteProducts(ids) {
  return request({
    url: '/api/products/bulk-delete/',
    method: 'delete',
    data: { ids }
  })
}

// ==================== 分类相关接口 ====================

/**
 * 获取所有分类
 * @returns {Promise}
 */
export function getCategories() {
  return request({
    url: '/api/categories/',
    method: 'get'
  })
}

/**
 * 获取分类详情
 * @param {Number} categoryId - 分类ID
 * @returns {Promise}
 */
export function getCategoryDetail(categoryId) {
  return request({
    url: '/api/categories/' + categoryId + '/',
    method: 'get'
  })
}

/**
 * 创建分类（管理员）
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
 * 更新分类（管理员）
 * @param {Number} categoryId - 分类ID
 * @param {Object} data - 要更新的分类数据
 * @returns {Promise}
 */
export function updateCategory(categoryId, data) {
  return request({
    url: '/api/categories/' + categoryId + '/',
    method: 'put',
    data
  })
}

/**
 * 删除分类（管理员）
 * @param {Number} categoryId - 分类ID
 * @returns {Promise}
 */
export function deleteCategory(categoryId) {
  return request({
    url: '/api/categories/' + categoryId + '/',
    method: 'delete'
  })
}

// ==================== 购物车相关接口 ====================

/**
 * 获取购物车
 * @returns {Promise}
 */
export function getCart() {
  return request({
    url: '/api/cart/',
    method: 'get'
  })
}

/**
 * 添加商品到购物车
 * @param {Object} data - 包含product_id和quantity的对象
 * @returns {Promise}
 */
export function addToCart(data) {
  return request({
    url: '/api/cart/items/',
    method: 'post',
    data
  })
}

/**
 * 更新购物车商品数量
 * @param {Number} itemId - 购物车商品ID
 * @param {Number} quantity - 新的数量
 * @returns {Promise}
 */
export function updateCartItem(itemId, quantity) {
  return request({
    url: '/api/cart/items/' + itemId + '/',
    method: 'put',
    data: { quantity }
  })
}

/**
 * 删除购物车商品
 * @param {Number} itemId - 购物车商品ID
 * @returns {Promise}
 */
export function removeCartItem(itemId) {
  return request({
    url: '/api/cart/items/' + itemId + '/',
    method: 'delete'
  })
}

/**
 * 清空购物车
 * @returns {Promise}
 */
export function clearCart() {
  return request({
    url: '/api/cart/',
    method: 'delete'
  })
}

// ==================== 订单相关接口 ====================

/**
 * 创建订单
 * @param {Object} data - 订单数据
 * @returns {Promise}
 */
export function createOrder(data) {
  return request({
    url: '/api/orders/',
    method: 'post',
    data
  })
}

/**
 * 获取用户订单列表
 * @returns {Promise}
 */
export function getUserOrders() {
  return request({
    url: '/api/orders/user',
    method: 'get'
  })
}

/**
 * 获取订单详情
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderDetail(orderId) {
  return request({
    url: '/api/orders/' + orderId + '/',
    method: 'get'
  })
}

/**
 * 更新订单状态（管理员）
 * @param {Number} orderId - 订单ID
 * @param {String} status - 新状态
 * @returns {Promise}
 */
export function updateOrderStatus(orderId, status) {
  return request({
    url: '/api/orders/' + orderId + '/status',
    method: 'put',
    data: { status }
  })
}

/**
 * 获取所有订单（管理员）
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getAllOrders(params) {
  return request({
    url: '/api/orders/',
    method: 'get',
    params
  })
}

// ==================== 数据分析相关接口 ====================

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

export default {
  login,
  register,
  logout,
  getUserInfo,
  updateUserInfo,
  adminLogin,
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  batchDeleteProducts,
  getCategories,
  getCategoryDetail,
  createCategory,
  updateCategory,
  deleteCategory,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getUserOrders,
  getOrderDetail,
  updateOrderStatus,
  getAllOrders,
  getUserActivity,
  getProductViews,
  getSalesStats,
  getProductSales
}
