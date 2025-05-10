import request from '@/utils/request';

/**
 * 获取分类列表（管理员）
 * @param {Object} params - 查询参数
 * @param {Number} params.page - 页码
 * @param {Number} params.limit - 每页数量
 * @returns {Promise} 分类列表
 */
export function getCategories(params) {
  return request({
    url: '/api/admin/categories',
    method: 'get',
    params
  });
}

/**
 * 获取分类详情（管理员）
 * @param {Number} id - 分类ID
 * @returns {Promise} 分类详情
 */
export function getCategoryDetail(id) {
  return request({
    url: `/api/admin/categories/${id}`,
    method: 'get'
  });
}

/**
 * 创建分类（管理员）
 * @param {Object} data - 分类数据
 * @param {String} data.name - 分类名称
 * @param {String} data.description - 分类描述
 * @returns {Promise} 创建结果
 */
export function createCategory(data) {
  return request({
    url: '/api/admin/categories',
    method: 'post',
    data
  });
}

/**
 * 更新分类（管理员）
 * @param {Number} id - 分类ID
 * @param {Object} data - 分类数据
 * @param {String} data.name - 分类名称
 * @param {String} data.description - 分类描述
 * @returns {Promise} 更新结果
 */
export function updateCategory(id, data) {
  return request({
    url: `/api/admin/categories/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除分类（管理员）
 * @param {Number} id - 分类ID
 * @returns {Promise} 删除结果
 */
export function deleteCategory(id) {
  return request({
    url: `/api/admin/categories/${id}`,
    method: 'delete'
  });
}
