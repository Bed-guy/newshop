import request from '@/utils/request'

// 获取商户列表
export function listApi(params) {
  return request({
    url: '/api/admin/merchants/',
    method: 'get',
    params
  })
}

// 获取商户详情
export function detailApi(id) {
  return request({
    url: `/api/admin/merchants/${id}`,
    method: 'get'
  })
}

// 创建商户
export function createApi(data) {
  return request({
    url: '/api/admin/merchants/',
    method: 'post',
    data
  })
}

// 更新商户
export function updateApi(id, data) {
  return request({
    url: `/api/admin/merchants/${id}`,
    method: 'put',
    data
  })
}

// 删除商户
export function deleteApi(id) {
  return request({
    url: `/api/admin/merchants/${id}`,
    method: 'delete'
  })
}
