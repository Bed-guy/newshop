import request from '@/utils/request';

/**
 * 获取用户列表（管理员）
 * @param {Object} params - 查询参数
 * @param {Number} params.page - 页码
 * @param {Number} params.limit - 每页数量
 * @param {String} params.username - 用户名
 * @param {String} params.email - 邮箱
 * @param {Boolean} params.is_staff - 是否是员工
 * @param {Boolean} params.is_active - 是否激活
 * @returns {Promise} 用户列表
 */
export function getUsers(params) {
  // 转换参数名称以匹配后端API
  const apiParams = {
    page: params.pageNo || params.page || 1,
    page_size: params.pageSize || params.limit || 10,
    username: params.username,
    email: params.email,
    is_staff: params.is_staff,
    is_active: params.is_active
  };

  return request({
    url: '/api/auth/users/',
    method: 'get',
    params: apiParams
  }).then(response => {
    // 转换响应格式以匹配前端组件期望的格式
    return {
      items: response.results || [],
      total: response.count || 0,
      page: params.pageNo || params.page || 1,
      limit: params.pageSize || params.limit || 10,
      pages: Math.ceil((response.count || 0) / (params.pageSize || params.limit || 10))
    };
  });
}

/**
 * 获取用户详情（管理员）
 * @param {Number} id - 用户ID
 * @returns {Promise} 用户详情
 */
export function getUserDetail(id) {
  return request({
    url: `/api/admin/users/${id}`,
    method: 'get'
  });
}

/**
 * 创建用户（管理员）
 * @param {Object} data - 用户数据
 * @param {String} data.username - 用户名
 * @param {String} data.email - 邮箱
 * @param {String} data.password - 密码
 * @param {String} data.first_name - 名
 * @param {String} data.last_name - 姓
 * @param {Boolean} data.is_staff - 是否是员工
 * @param {Boolean} data.is_superuser - 是否是超级管理员
 * @param {Boolean} data.is_active - 是否激活
 * @returns {Promise} 创建结果
 */
export function createUser(data) {
  return request({
    url: '/api/admin/users',
    method: 'post',
    data
  });
}

/**
 * 更新用户（管理员）
 * @param {Number} id - 用户ID
 * @param {Object} data - 用户数据
 * @param {String} data.username - 用户名
 * @param {String} data.email - 邮箱
 * @param {String} data.password - 密码
 * @param {String} data.first_name - 名
 * @param {String} data.last_name - 姓
 * @param {Boolean} data.is_staff - 是否是员工
 * @param {Boolean} data.is_superuser - 是否是超级管理员
 * @param {Boolean} data.is_active - 是否激活
 * @returns {Promise} 更新结果
 */
export function updateUser(id, data) {
  return request({
    url: `/api/admin/users/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除用户（管理员）
 * @param {Number} id - 用户ID
 * @returns {Promise} 删除结果
 */
export function deleteUser(id) {
  return request({
    url: `/api/admin/users/${id}`,
    method: 'delete'
  });
}
