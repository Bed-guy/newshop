import request from '@/utils/request'

/**
 * 获取订单列表
 * @param {Object} params - 查询参数，包括分页、搜索、状态和用户ID过滤
 * @returns {Promise}
 */
export function listApi(params = {}) {
  // 获取当前登录用户信息
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // 如果不是超级管理员，则添加商户ID过滤
  if (userInfo.id && userInfo.is_superuser !== '1' && userInfo.is_superuser !== 1) {
    params.merchant_id = userInfo.id;
  }

  return request({
    url: '/api/orders/',
    method: 'get',
    params
  })
}

/**
 * 获取订单详情
 * @param {number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderDetailApi(orderId) {
  return request({
    url: `/api/orders/${orderId}/`,
    method: 'get'
  })
}

/**
 * 创建订单
 * @param {Object} data - 订单数据
 * @returns {Promise}
 */
export function createApi(data) {
  return request({
    url: '/api/orders/create/',
    method: 'post',
    data
  })
}

/**
 * 取消订单
 * @param {Object} params - 包含订单ID的参数对象
 * @returns {Promise}
 */
export function cancelOrderApi(params) {
  return request({
    url: `/api/orders/${params.id}/cancel/`,
    method: 'post'
  })
}

/**
 * 支付订单
 * @param {Object} params - 包含订单ID的参数对象
 * @returns {Promise}
 */
export function payOrderApi(params) {
  return request({
    url: `/api/orders/${params.id}/pay/`,
    method: 'post'
  })
}

/**
 * 删除订单（管理员功能）
 * @param {Object} params - 包含要删除的订单ID的参数对象
 * @returns {Promise}
 */
export function deleteApi(params) {
  console.log("发送删除订单请求:", params);
  const ids = params.ids.split(',')
  const requests = ids.map(id => {
    return request({
      url: `/api/orders/${id}/`,
      method: 'delete'
    })
  })

  return Promise.all(requests)
}

/**
 * 更新订单（管理员功能）
 * @param {number} id - 订单ID
 * @param {Object} data - 更新的订单数据
 * @returns {Promise}
 */
export function updateApi(id, data) {
  return request({
    url: `/api/orders/${id}/`,
    method: 'put',
    data
  })
}

/**
 * 延迟发货（管理员功能，如需实现）
 */
export function delayApi(params) {
  // 示例实现，您可能需要根据实际后端API调整
  return request({
    url: `/api/orders/${params.id}/delay/`,
    method: 'post',
    data: params
  })
}
