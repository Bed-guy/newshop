// filepath: [request.js](http://_vscodecontentref_/1)
import axios from 'axios'
// 创建 axios 实例
const request = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 180000
})

request.interceptors.request.use(config => {
  // 检查是否是管理员接口

  // 根据请求类型选择不同的token
  const token = localStorage.getItem('token');

  console.log(token);
  console.log(token);
  console.log(token);
  console.log(token);
  
  if (token) {
    // 使用Bearer token格式
    config.headers['Authorization'] = `Bearer ${token}`;
    // 删除不符合标准的token头
    // config.headers['token'] = token
  }

  return config;
})

// 添加响应拦截器处理错误
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('请求错误:', error)
    // 处理401错误，可能需要重定向到登录页面
    if (error.response && error.response.status === 401) {
      console.log('用户未授权，请登录')
      // 可以在这里添加跳转到登录页面的逻辑
    }
    return Promise.reject(error)
  }
)

export default request