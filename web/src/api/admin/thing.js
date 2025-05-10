import request from '@/utils/request'

// 获取商品列表
export function listApi(params = {}) {
  // 获取当前登录用户信息
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // 如果不是超级管理员，添加商户ID过滤
  if (userInfo.id && userInfo.is_superuser !== '1' && userInfo.is_superuser !== 1) {
    params.merchant_id = userInfo.id;
  }

  return request({
    url: '/api/products/',
    method: 'get',
    params
  })
}

// 创建商品
export function createApi(data) {
  // 获取当前登录用户信息
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // 如果不是超级管理员，添加商户ID
  if (userInfo.id && userInfo.is_superuser !== '1' && userInfo.is_superuser !== 1) {
    data.merchant_id = userInfo.id;
  }

  return request({
    url: '/api/products/',
    method: 'post',
    data
  })
}

// 更新商品
export function updateApi(id, data) {
  // 获取当前登录用户信息
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // 如果不是超级管理员，添加商户ID
  if (userInfo.id && userInfo.is_superuser !== '1' && userInfo.is_superuser !== 1) {
    data.merchant_id = userInfo.id;
  }

  return request({
    url: `/api/products/${id}/`,
    method: 'put',
    data
  })
}
// 删除商品
export function deleteApi(params) {
  // 如果只有一个ID，则使用单个删除API
  if (params.ids.indexOf(',') === -1) {
    return request({
      url: `/api/products/${params.ids}/`,
      method: 'delete'
    });
  }

  // 多个ID使用批量删除API
  return request({
    url: '/api/products/bulk-delete/',
    method: 'delete',
    data: {
      ids: params.ids
    }
  });
}

// 获取分类列表 - 用于商品编辑时选择分类
export function getCategoriesApi() {
  return request({
    url: '/api/categories/',
    method: 'get'
  })
}
