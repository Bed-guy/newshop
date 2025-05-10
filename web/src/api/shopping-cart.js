import request from '@/utils/request';

/**
 * 获取购物车
 * @returns {Promise} 购物车数据
 */
export function getShoppingCart() {
  return request({
    url: '/api/shopping-cart',
    method: 'get'
  });
}

/**
 * 添加商品到购物车
 * @param {Object} data - 商品数据
 * @param {Number} data.product_id - 商品ID
 * @param {Number} data.quantity - 数量
 * @returns {Promise} 添加的商品信息
 */
export function addToCart(data) {
  return request({
    url: '/api/shopping-cart/add',
    method: 'post',
    data
  });
}

/**
 * 更新购物车商品数量
 * @param {Number} id - 购物车商品ID
 * @param {Object} data - 更新数据
 * @param {Number} data.quantity - 新数量
 * @returns {Promise} 更新后的商品信息
 */
export function updateCartItem(id, data) {
  return request({
    url: `/api/shopping-cart/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除购物车商品
 * @param {Number} id - 购物车商品ID
 * @returns {Promise} 删除结果
 */
export function removeCartItem(id) {
  return request({
    url: `/api/shopping-cart/${id}`,
    method: 'delete'
  });
}

/**
 * 清空购物车
 * @returns {Promise} 清空结果
 */
export function clearCart() {
  return request({
    url: '/api/shopping-cart',
    method: 'delete'
  });
}

// 兼容旧的API路径
/**
 * 获取购物车（兼容旧API）
 * @returns {Promise} 购物车数据
 */
export function getCart() {
  return request({
    url: '/myapp/index/cart/list',
    method: 'get'
  });
}

/**
 * 添加商品到购物车（兼容旧API）
 * @param {Object} data - 商品数据
 * @param {Number} data.product_id - 商品ID
 * @param {Number} data.quantity - 数量
 * @returns {Promise} 添加的商品信息
 */
export function addToCartCompat(data) {
  return request({
    url: '/myapp/index/cart/add',
    method: 'post',
    data
  });
}
