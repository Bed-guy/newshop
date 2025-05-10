import request from '@/utils/request';

/**
 * 获取订单列表（管理员）
 * @param {Object} params - 查询参数
 * @param {Number} params.page - 页码
 * @param {Number} params.limit - 每页数量
 * @param {String} params.status - 订单状态
 * @param {Number} params.user_id - 用户ID
 * @returns {Promise} 订单列表
 */
export function getOrders(params) {
  return request({
    url: '/api/admin/orders',
    method: 'get',
    params
  });
}

/**
 * 获取订单详情（管理员）
 * @param {Number} id - 订单ID
 * @returns {Promise} 订单详情
 */
export function getOrderDetail(id) {
  return request({
    url: `/api/admin/orders/${id}`,
    method: 'get'
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
    url: `/api/admin/orders/${id}/status`,
    method: 'put',
    data
  });
}

/**
 * 删除订单（管理员）
 * @param {Number} id - 订单ID
 * @returns {Promise} 删除结果
 */
export function deleteOrder(id) {
  return request({
    url: `/api/admin/orders/${id}`,
    method: 'delete'
  });
}
