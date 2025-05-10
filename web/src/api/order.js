import request from '@/utils/request';

/**
 * 创建订单
 * @param {Object} data - 订单数据
 * @returns {Promise} 创建的订单
 */
export function createOrder(data) {
  return request({
    url: '/api/orders/',
    method: 'post',
    data
  });
}

/**
 * 获取订单列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 订单列表
 */
export function getOrders(params) {
  return request({
    url: '/api/orders/',
    method: 'get',
    params
  });
}

/**
 * 获取用户订单列表
 * @returns {Promise} 用户订单列表
 */
export function getUserOrders() {
  return request({
    url: '/api/orders/user',
    method: 'get'
  });
}

/**
 * 获取订单详情
 * @param {Number} id - 订单ID
 * @returns {Promise} 订单详情
 */
export function getOrderDetail(id) {
  return request({
    url: `/api/orders/${id}`,
    method: 'get'
  });
}

/**
 * 支付订单
 * @param {Number} id - 订单ID
 * @param {Object} data - 支付数据
 * @param {String} data.payment_method - 支付方式
 * @returns {Promise} 支付结果
 */
export function payOrder(id, data) {
  return request({
    url: `/api/orders/${id}/pay`,
    method: 'post',
    data
  });
}

/**
 * 更新订单状态（管理员）
 * @param {Number} id - 订单ID
 * @param {Object} data - 状态数据
 * @param {String} data.status - 订单状态
 * @returns {Promise} 更新结果
 */
export function updateOrderStatus(id, data) {
  return request({
    url: `/api/orders/${id}/status`,
    method: 'put',
    data
  });
}

// 兼容旧的API路径
/**
 * 支付订单（兼容旧API）
 * @param {Number} id - 订单ID
 * @param {Object} data - 支付数据
 * @param {String} data.payment_method - 支付方式
 * @returns {Promise} 支付结果
 */
export function payOrderCompat(id, data) {
  return request({
    url: `/myapp/index/order/pay/${id}`,
    method: 'post',
    data
  });
}
