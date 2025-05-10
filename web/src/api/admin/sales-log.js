import request from '@/utils/request'

// 获取销售日志列表
export function listApi(params) {
  return request({
    url: '/api/admin/sales-logs/',
    method: 'get',
    params
  })
}

// 获取销售日志详情
export function detailApi(id) {
  return request({
    url: `/api/admin/sales-logs/${id}`,
    method: 'get'
  })
}

// 获取商户列表（用于筛选）
export function getMerchants() {
  return request({
    url: '/api/admin/merchants/',
    method: 'get',
    params: {
      page_size: 100 // 获取所有商户
    }
  })
}
