import axios from '@/utils/request.js'

const api = {
  getCart: '/api/cart/',
  addToCart: '/api/cart/items/',
  updateCartItem: '/api/cart/items/',  // 更新时需要加上ID，例如：/api/cart/items/1/
  removeCartItem: '/api/cart/items/',  // 删除时需要加上ID
  clearCart: '/api/cart/'  // 在Node.js后端中，清空购物车使用DELETE方法访问/api/cart/
}

/**
 * 获取购物车
 */
export const getCartApi = function() {
  return axios({
    url: api.getCart,
    method: 'get'
  })
}

/**
 * 添加商品到购物车
 * @param {Object} data - 包含product_id和quantity的对象
 */
export const addToCartApi = function(data) {
  return axios({
    url: api.addToCart,
    method: 'post',
    data: data
  })
}

/**
 * 更新购物车商品数量
 * @param {Number} itemId - 购物车项ID
 * @param {Object} data - 包含quantity的对象
 */
export const updateCartItemApi = function(itemId, data) {
  return axios({
    url: `${api.updateCartItem}${itemId}/`,
    method: 'put',
    data: data
  })
}

/**
 * 从购物车移除商品
 * @param {Number} itemId - 购物车项ID
 */
export const removeCartItemApi = function(itemId) {
  return axios({
    url: `${api.removeCartItem}${itemId}/`,
    method: 'delete'
  })
}

/**
 * 清空购物车
 */
export const clearCartApi = function() {
  return axios({
    url: api.clearCart,
    method: 'delete'
  })
}