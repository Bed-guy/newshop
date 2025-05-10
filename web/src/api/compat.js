/**
 * 兼容 API 接口文件
 * 用于支持旧的 API 路径格式 (/myapp/index/...)
 */
import request from '@/utils/request'

// ==================== 用户相关接口 ====================

/**
 * 用户登录
 * @param {Object} data - 包含用户名和密码的对象
 * @returns {Promise}
 */
export function loginApi(data) {
  return request({
    url: '/myapp/index/user/login',
    method: 'post',
    data
  })
}

/**
 * 用户注册
 * @param {Object} data - 包含用户名、密码和邮箱的对象
 * @returns {Promise}
 */
export function registerApi(data) {
  return request({
    url: '/myapp/index/user/register',
    method: 'post',
    data
  })
}

/**
 * 获取用户信息
 * @param {Object} params - 包含用户ID的参数对象
 * @returns {Promise}
 */
export function infoApi(params) {
  return request({
    url: '/myapp/index/user/info',
    method: 'get',
    params
  })
}

/**
 * 更新用户信息
 * @param {Object} data - 要更新的用户数据
 * @returns {Promise}
 */
export function updateApi(data) {
  return request({
    url: '/myapp/index/user/update',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data;charset=utf-8'
    },
    data
  })
}

/**
 * 更新用户密码
 * @param {Object} data - 包含旧密码和新密码的对象
 * @returns {Promise}
 */
export function updatePwdApi(data) {
  return request({
    url: '/myapp/index/user/updatePwd',
    method: 'post',
    data
  })
}

// ==================== 商品相关接口 ====================

/**
 * 获取商品列表
 * @param {Object} data - 查询参数
 * @returns {Promise}
 */
export function listThingApi(data) {
  return request({
    url: '/myapp/index/thing/list',
    method: 'get',
    params: data
  })
}

/**
 * 获取商品详情
 * @param {Object} data - 包含商品ID的对象
 * @returns {Promise}
 */
export function detailThingApi(data) {
  return request({
    url: '/myapp/index/thing/detail',
    method: 'get',
    params: data
  })
}

/**
 * 添加商品到收藏
 * @param {Object} data - 包含商品ID的对象
 * @returns {Promise}
 */
export function addWishUserApi(data) {
  return request({
    url: '/myapp/index/thing/addWishUser',
    method: 'post',
    params: data
  })
}

/**
 * 从收藏中移除商品
 * @param {Object} data - 包含商品ID的对象
 * @returns {Promise}
 */
export function removeWishUserApi(data) {
  return request({
    url: '/myapp/index/thing/removeWishUser',
    method: 'post',
    params: data
  })
}

/**
 * 获取收藏的商品列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getWishThingListApi(params) {
  return request({
    url: '/myapp/index/thing/getWishThingList',
    method: 'get',
    params
  })
}

/**
 * 添加商品到收藏夹
 * @param {Object} data - 包含商品ID的对象
 * @returns {Promise}
 */
export function addCollectUserApi(data) {
  return request({
    url: '/myapp/index/thing/addCollectUser',
    method: 'post',
    params: data
  })
}

/**
 * 从收藏夹中移除商品
 * @param {Object} data - 包含商品ID的对象
 * @returns {Promise}
 */
export function removeCollectUserApi(data) {
  return request({
    url: '/myapp/index/thing/removeCollectUser',
    method: 'post',
    params: data
  })
}

/**
 * 获取收藏夹中的商品列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCollectThingListApi(params) {
  return request({
    url: '/myapp/index/thing/getCollectThingList',
    method: 'get',
    params
  })
}

// ==================== 订单相关接口 ====================

/**
 * 获取订单列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function listOrderApi(params) {
  return request({
    url: '/myapp/index/order/list',
    method: 'get',
    params
  })
}

/**
 * 创建订单
 * @param {Object} data - 订单数据
 * @returns {Promise}
 */
export function createOrderApi(data) {
  return request({
    url: '/myapp/index/order/create',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data;charset=utf-8'
    },
    data
  })
}

/**
 * 取消订单
 * @param {Object} params - 包含订单ID的参数对象
 * @returns {Promise}
 */
export function cancelOrderApi(params) {
  return request({
    url: '/myapp/index/order/cancel_order',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data;charset=utf-8'
    },
    params
  })
}

/**
 * 延迟订单
 * @param {Object} params - 包含订单ID的参数对象
 * @returns {Promise}
 */
export function delayOrderApi(params) {
  return request({
    url: '/myapp/index/order/delay',
    method: 'post',
    params
  })
}

// ==================== 地址相关接口 ====================

/**
 * 获取地址列表
 * @param {Object} data - 查询参数
 * @returns {Promise}
 */
export function listAddressApi(data) {
  return request({
    url: '/myapp/index/address/list',
    method: 'get',
    params: data
  })
}

/**
 * 创建地址
 * @param {Object} data - 地址数据
 * @returns {Promise}
 */
export function createAddressApi(data) {
  return request({
    url: '/myapp/index/address/create',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data;charset=utf-8'
    },
    data
  })
}

/**
 * 删除地址
 * @param {Object} data - 包含地址ID的对象
 * @returns {Promise}
 */
export function deleteAddressApi(data) {
  return request({
    url: '/myapp/index/address/delete',
    method: 'post',
    params: data
  })
}

/**
 * 更新地址
 * @param {Object} data - 地址数据
 * @returns {Promise}
 */
export function updateAddressApi(data) {
  return request({
    url: '/myapp/index/address/update',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data;charset=utf-8'
    },
    data
  })
}

// ==================== 评论相关接口 ====================

/**
 * 获取评论列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function listCommentApi(params) {
  return request({
    url: '/myapp/index/comment/list',
    method: 'get',
    params
  })
}

/**
 * 获取我的评论列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function listMyCommentsApi(params) {
  return request({
    url: '/myapp/index/comment/listMyComments',
    method: 'get',
    params
  })
}

/**
 * 创建评论
 * @param {Object} data - 评论数据
 * @returns {Promise}
 */
export function createCommentApi(data) {
  return request({
    url: '/myapp/index/comment/create',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data;charset=utf-8'
    },
    data
  })
}

/**
 * 删除评论
 * @param {Object} params - 包含评论ID的参数对象
 * @returns {Promise}
 */
export function deleteCommentApi(params) {
  return request({
    url: '/myapp/index/comment/delete',
    method: 'post',
    params
  })
}

/**
 * 点赞评论
 * @param {Object} params - 包含评论ID的参数对象
 * @returns {Promise}
 */
export function likeCommentApi(params) {
  return request({
    url: '/myapp/index/comment/like',
    method: 'post',
    params
  })
}

export default {
  loginApi,
  registerApi,
  infoApi,
  updateApi,
  updatePwdApi,
  listThingApi,
  detailThingApi,
  addWishUserApi,
  removeWishUserApi,
  getWishThingListApi,
  addCollectUserApi,
  removeCollectUserApi,
  getCollectThingListApi,
  listOrderApi,
  createOrderApi,
  cancelOrderApi,
  delayOrderApi,
  listAddressApi,
  createAddressApi,
  deleteAddressApi,
  updateAddressApi,
  listCommentApi,
  listMyCommentsApi,
  createCommentApi,
  deleteCommentApi,
  likeCommentApi
}
