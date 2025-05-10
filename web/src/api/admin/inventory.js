import request from '@/utils/request'

// 获取库存列表
export function listApi(params) {
  return request({
    url: '/api/admin/inventory/',
    method: 'get',
    params
  })
}

// 更新商品库存
export function updateApi(id, data) {
  return request({
    url: `/api/admin/inventory/${id}`,
    method: 'put',
    data
  })
}

// 批量更新库存
export function batchUpdateApi(data) {
  return request({
    url: '/api/admin/inventory/batch-update',
    method: 'post',
    data
  })
}

// 获取分类列表（用于筛选）
export function getCategoriesApi() {
  return request({
    url: '/api/categories/',
    method: 'get'
  })
}

// 获取商户列表（用于筛选）
export function getMerchantsApi() {
  return request({
    url: '/api/admin/merchants/',
    method: 'get',
    params: {
      page_size: 100 // 获取所有商户
    }
  })
}
