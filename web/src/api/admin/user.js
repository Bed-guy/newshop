import request from '@/utils/request'

// 获取用户列表
export function listApi(params) {
  console.log("发送获取用户列表请求:", params);
  return request({
    url: '/api/auth/users/',
    method: 'get',
    params
  })
}

// 创建用户
export function createApi(data) {
  console.log("发送创建用户请求:", data);
  return request({
    url: '/api/auth/users/',
    method: 'post',
    data
  })
}

// 更新用户
export function updateApi(id, data) {
  console.log("发送更新用户请求:", id, data);
  return request({
    url: `/api/auth/users/${id}/`,
    method: 'put',
    data
  })
}

// 删除用户
export function deleteApi(params) {
  console.log("发送删除用户请求:", params);
  const ids = params.ids.split(',')
  const requests = ids.map(id => {
    return request({
      url: `/api/auth/users/${id}/`,
      method: 'delete'
    })
  })
  
  return Promise.all(requests)
}

// 修改密码
export function updatePasswordApi(id, data) {
  console.log("发送修改密码请求:", id, data);
  return request({
    url: `/api/auth/users/${id}/change_password/`,
    method: 'post',
    data
  })
}

// 获取当前用户信息
export function getUserInfoApi() {
  return request({
    url: '/api/auth/me/',
    method: 'get'
  })
}
