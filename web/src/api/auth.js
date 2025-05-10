import request from '@/utils/request'

// 用户注册
export function registerApi(data) {
  return request({
    url: '/api/auth/register/',
    method: 'post',
    data: {
      username: data.username,
      password: data.password,
      email: data.username // 使用username作为email，因为表单中使用username输入邮箱
    }
  })
}

// 用户登录
export function login(username, password) {
  return request({
    url: '/api/auth/login/',
    method: 'post',
    data: {
      username,
      password
    }
  })
}

// 管理员登录
export function adminLogin(username, password) {
  return request({
    url: '/myapp/auth/login/',
    method: 'post',
    data: {
      username,
      password
    }
  })
}