/**
 * 商户分类管理 API 接口文件
 */
import request from '@/utils/request'

/**
 * 获取商户分类列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCategories(params) {
  return request({
    url: '/api/admin/merchant-categories',
    method: 'get',
    params
  })
}

/**
 * 获取商户分类详情
 * @param {Number} categoryId - 分类ID
 * @returns {Promise}
 */
export function getCategory(categoryId) {
  return request({
    url: `/api/admin/merchant-categories/${categoryId}`,
    method: 'get'
  })
}

/**
 * 创建商户分类
 * @param {Object} data - 分类数据
 * @returns {Promise}
 */
export function createCategory(data) {
  return request({
    url: '/api/admin/merchant-categories',
    method: 'post',
    data
  })
}

/**
 * 更新商户分类
 * @param {Number} categoryId - 分类ID
 * @param {Object} data - 分类数据
 * @returns {Promise}
 */
export function updateCategory(categoryId, data) {
  return request({
    url: `/api/admin/merchant-categories/${categoryId}`,
    method: 'put',
    data
  })
}

/**
 * 删除商户分类
 * @param {Number} categoryId - 分类ID
 * @returns {Promise}
 */
export function deleteCategory(categoryId) {
  return request({
    url: `/api/admin/merchant-categories/${categoryId}`,
    method: 'delete'
  })
}

export default {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
}
