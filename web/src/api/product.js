import request from '@/utils/request'

// 获取商品列表
export function getProducts(params) {
  return request({
    url: '/api/products/',
    method: 'get',
    params
  })
}

// 获取商品详情
export function getProductDetail(id) {
  return request({
    url: `/api/products/${id}/`,
    method: 'get'
  })
}

// 获取商品分类列表
export function getCategories() {
  return request({
    url: '/api/categories/',
    method: 'get'
  })
}

// 获取按商户分组的分类列表
export function getMerchantCategories() {
  return request({
    url: '/api/categories/by-merchant/',
    method: 'get'
  })
}

// 获取商品评论
export function getProductComments(productId) {
  return request({
    url: `/api/products/${productId}/comments/`,
    method: 'get'
  })
}

// 添加商品到购物车
export function addToCart(data) {
  return request({
    url: '/api/cart/add/',
    method: 'post',
    data
  })
}

// 获取相关商品推荐
export function getRelatedProducts(productId) {
  return request({
    url: `/api/products/${productId}/related/`,
    method: 'get'
  })
}

// 获取首页推荐商品
export function getRecommendedProducts(limit = 10) {
  return request({
    url: '/api/recommendations/',
    method: 'get',
    params: { limit }
  })
}
