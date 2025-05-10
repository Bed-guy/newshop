const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const { authenticateToken } = require('../utils/auth');
const logger = require('../logger');

/**
 * 获取首页推荐商品
 * 根据用户的浏览历史、购买历史、收藏商品等数据进行个性化推荐
 * 如果用户未登录，则返回热门商品
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || null;
    const limit = parseInt(req.query.limit) || 10;

    // 如果用户已登录，提供个性化推荐
    if (userId) {
      const recommendations = await getPersonalizedRecommendations(userId, limit);
      return res.json(recommendations);
    }

    // 用户未登录，返回热门商品
    const hotProducts = await getHotProducts(limit);
    res.json(hotProducts);
  } catch (error) {
    logger.error('获取推荐商品失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * 获取个性化推荐商品
 * @param {number} userId - 用户ID
 * @param {number} limit - 返回商品数量限制
 * @returns {Array} 推荐商品列表
 */
async function getPersonalizedRecommendations(userId, limit) {
  // 1. 获取用户最近浏览的商品分类
  const recentCategories = await getRecentViewedCategories(userId);

  // 2. 获取用户最近购买的商品分类
  const purchasedCategories = await getRecentPurchasedCategories(userId);

  // 3. 获取用户收藏的商品
  const favoriteProducts = await getFavoriteProducts(userId);

  // 4. 合并用户兴趣分类，优先级：购买 > 收藏 > 浏览
  const userInterests = mergeUserInterests(purchasedCategories, recentCategories, favoriteProducts);

  // 5. 根据用户兴趣获取推荐商品
  const recommendations = await getRecommendedProductsByInterests(userInterests, userId, limit);

  return recommendations;
}

/**
 * 获取用户最近浏览的商品分类
 * @param {number} userId - 用户ID
 * @returns {Array} 分类ID及其权重
 */
async function getRecentViewedCategories(userId) {
  const viewedCategories = await query(`
    SELECT
      p.category_id,
      COUNT(*) as view_count,
      MAX(pvl.view_time) as last_view_time
    FROM
      product_view_logs pvl
    JOIN
      products_product p ON pvl.product_id = p.id
    WHERE
      pvl.user_id = ? AND
      pvl.view_time > DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY
      p.category_id
    ORDER BY
      view_count DESC,
      last_view_time DESC
    LIMIT 5
  `, [userId]);

  return viewedCategories.map(category => ({
    category_id: category.category_id,
    weight: category.view_count * 1 // 浏览权重为1
  }));
}

/**
 * 获取用户最近购买的商品分类
 * @param {number} userId - 用户ID
 * @returns {Array} 分类ID及其权重
 */
async function getRecentPurchasedCategories(userId) {
  const purchasedCategories = await query(`
    SELECT
      p.category_id,
      COUNT(*) as purchase_count,
      MAX(o.created_at) as last_purchase_time
    FROM
      orders_orderitem oi
    JOIN
      orders_order o ON oi.order_id = o.id
    JOIN
      products_product p ON oi.product_id = p.id
    WHERE
      o.user_id = ? AND
      o.status = 'paid' AND
      o.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY
      p.category_id
    ORDER BY
      purchase_count DESC,
      last_purchase_time DESC
    LIMIT 5
  `, [userId]);

  return purchasedCategories.map(category => ({
    category_id: category.category_id,
    weight: category.purchase_count * 3 // 购买权重为3
  }));
}

/**
 * 获取用户收藏的商品
 * @param {number} userId - 用户ID
 * @returns {Array} 收藏的商品ID及其分类
 */
async function getFavoriteProducts(userId) {
  const favoriteProducts = await query(`
    SELECT
      p.id as product_id,
      p.category_id
    FROM
      user_wish_list uwl
    JOIN
      products_product p ON uwl.product_id = p.id
    WHERE
      uwl.user_id = ?
    LIMIT 10
  `, [userId]);

  // 统计收藏的分类
  const categoryCount = {};
  favoriteProducts.forEach(product => {
    if (!categoryCount[product.category_id]) {
      categoryCount[product.category_id] = 0;
    }
    categoryCount[product.category_id]++;
  });

  return Object.keys(categoryCount).map(categoryId => ({
    category_id: parseInt(categoryId),
    weight: categoryCount[categoryId] * 2 // 收藏权重为2
  }));
}

/**
 * 合并用户兴趣
 * @param {Array} purchasedCategories - 购买的分类
 * @param {Array} viewedCategories - 浏览的分类
 * @param {Array} favoriteCategories - 收藏的分类
 * @returns {Array} 合并后的用户兴趣
 */
function mergeUserInterests(purchasedCategories, viewedCategories, favoriteCategories) {
  const interestMap = {};

  // 合并所有兴趣，累加权重
  [...purchasedCategories, ...viewedCategories, ...favoriteCategories].forEach(interest => {
    if (!interest.category_id) return;

    if (!interestMap[interest.category_id]) {
      interestMap[interest.category_id] = 0;
    }
    interestMap[interest.category_id] += interest.weight;
  });

  // 转换为数组并排序
  return Object.keys(interestMap)
    .map(categoryId => ({
      category_id: parseInt(categoryId),
      weight: interestMap[categoryId]
    }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * 根据用户兴趣获取推荐商品
 * @param {Array} userInterests - 用户兴趣
 * @param {number} userId - 用户ID
 * @param {number} limit - 返回商品数量限制
 * @returns {Array} 推荐商品列表
 */
async function getRecommendedProductsByInterests(userInterests, userId, limit) {
  if (userInterests.length === 0) {
    return getHotProducts(limit);
  }

  // 获取用户已购买的商品ID，避免推荐已购买的商品
  const purchasedProductIds = await getPurchasedProductIds(userId);

  // 构建SQL查询，按兴趣权重分配推荐商品数量
  let recommendedProducts = [];
  let remainingLimit = limit;

  for (const interest of userInterests) {
    if (remainingLimit <= 0) break;

    // 根据兴趣权重分配推荐数量，但至少为1
    const categoryLimit = Math.max(1, Math.floor(remainingLimit * (interest.weight / getTotalWeight(userInterests))));

    // 获取该分类下的推荐商品
    const productsFromCategory = await getProductsByCategory(interest.category_id, purchasedProductIds, categoryLimit);

    recommendedProducts = [...recommendedProducts, ...productsFromCategory];
    remainingLimit -= productsFromCategory.length;
  }

  // 如果推荐商品不足，补充热门商品
  if (recommendedProducts.length < limit) {
    const existingIds = recommendedProducts.map(p => p.id);
    const hotProducts = await getHotProducts(limit - recommendedProducts.length, [...purchasedProductIds, ...existingIds]);
    recommendedProducts = [...recommendedProducts, ...hotProducts];
  }

  return recommendedProducts;
}

/**
 * 获取用户已购买的商品ID
 * @param {number} userId - 用户ID
 * @returns {Array} 已购买的商品ID列表
 */
async function getPurchasedProductIds(userId) {
  const purchasedItems = await query(`
    SELECT DISTINCT oi.product_id
    FROM orders_orderitem oi
    JOIN orders_order o ON oi.order_id = o.id
    WHERE o.user_id = ? AND o.status = 'paid'
  `, [userId]);

  return purchasedItems.map(item => item.product_id);
}

/**
 * 获取分类下的推荐商品
 * @param {number} categoryId - 分类ID
 * @param {Array} excludeIds - 排除的商品ID
 * @param {number} limit - 返回商品数量限制
 * @returns {Array} 推荐商品列表
 */
async function getProductsByCategory(categoryId, excludeIds, limit) {
  const excludeClause = excludeIds.length > 0
    ? `AND p.id NOT IN (${excludeIds.join(',')})`
    : '';

  const products = await query(`
    SELECT
      p.*,
      c.name as category_name,
      (SELECT COUNT(*) FROM product_view_logs WHERE product_id = p.id) as view_count
    FROM
      products_product p
    LEFT JOIN
      categories_category c ON p.category_id = c.id
    WHERE
      p.category_id = ?
      ${excludeClause}
    ORDER BY
      view_count DESC,
      p.created_at DESC
    LIMIT ?
  `, [categoryId, limit]);

  return formatProducts(products);
}

/**
 * 获取热门商品
 * @param {number} limit - 返回商品数量限制
 * @param {Array} excludeIds - 排除的商品ID
 * @returns {Array} 热门商品列表
 */
async function getHotProducts(limit, excludeIds = []) {
  const excludeClause = excludeIds.length > 0
    ? `AND p.id NOT IN (${excludeIds.join(',')})`
    : '';

  const hotProducts = await query(`
    SELECT
      p.*,
      c.name as category_name,
      COUNT(pvl.id) as view_count
    FROM
      products_product p
    LEFT JOIN
      categories_category c ON p.category_id = c.id
    LEFT JOIN
      product_view_logs pvl ON p.id = pvl.product_id
    WHERE
      1=1
      ${excludeClause}
    GROUP BY
      p.id
    ORDER BY
      view_count DESC,
      p.created_at DESC
    LIMIT ?
  `, [limit]);

  return formatProducts(hotProducts);
}

/**
 * 格式化商品数据
 * @param {Array} products - 原始商品数据
 * @returns {Array} 格式化后的商品数据
 */
function formatProducts(products) {
  return products.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: parseFloat(product.price),
    stock: product.stock,
    image_url: product.image_url,
    category_id: product.category_id,
    category_name: product.category_name,
    merchant_id: product.merchant_id,
    created_at: product.created_at,
    updated_at: product.updated_at
  }));
}

/**
 * 获取兴趣总权重
 * @param {Array} interests - 用户兴趣
 * @returns {number} 总权重
 */
function getTotalWeight(interests) {
  return interests.reduce((sum, interest) => sum + interest.weight, 0);
}

// 导出路由和推荐函数
module.exports = {
  router,
  getPersonalizedRecommendations,
  getHotProducts,
  getRecentViewedCategories,
  getRecentPurchasedCategories,
  getFavoriteProducts,
  mergeUserInterests,
  getRecommendedProductsByInterests,
  getPurchasedProductIds,
  getProductsByCategory,
  formatProducts,
  getTotalWeight
};
