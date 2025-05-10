const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, isAdmin } = require('../utils/auth');
const logger = require('../logger');

// 获取所有商品
router.get('/',  async (req, res) => {
  try {
    const { category, search, ordering, merchant_id, recommend } = req.query;
    const userId = req.headers['user-id'] || null;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;

    // 如果请求推荐商品
    if (recommend === 'true') {
      // 导入推荐函数
      const {
        getPersonalizedRecommendations,
        getHotProducts
      } = require('./recommendations');

      // 如果用户已登录，提供个性化推荐
      if (userId) {
        const recommendations = await getPersonalizedRecommendations(userId, pageSize);
        return res.json(recommendations);
      }

      // 用户未登录，返回热门商品
      const hotProducts = await getHotProducts(pageSize);
      return res.json(hotProducts);
    }

    // 常规商品列表查询
    let sql = `
      SELECT p.*, c.name as category_name
      FROM products_product p
      LEFT JOIN categories_category c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    // 分类过滤
    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    // 搜索过滤
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 商户ID过滤（如果提供）
    if (merchant_id) {
      sql += ' AND p.merchant_id = ?';
      params.push(merchant_id);
    }
    // 如果是已登录用户且不是超级管理员，则根据用户权限过滤
    // 注意：由于我们已经删除了authenticateToken中间件，这段代码可能不会执行
    // 保留它是为了兼容性，以防将来重新添加身份验证
    else if (req.user && !req.user.is_superuser) {
      sql += ' AND p.merchant_id = ?';
      params.push(req.user.id);
    }

    // 排序
    if (ordering) {
      const orderField = ordering.startsWith('-') ? ordering.substring(1) : ordering;
      const orderDirection = ordering.startsWith('-') ? 'DESC' : 'ASC';

      // 验证排序字段
      const validFields = ['price', 'created_at', 'stock'];
      if (validFields.includes(orderField)) {
        sql += ` ORDER BY p.${orderField} ${orderDirection}`;
      }
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }

    // 添加分页
    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ?, ?';
    params.push(offset, pageSize);

    const products = await query(sql, params);

    res.json(products);
  } catch (error) {
    logger.error('获取商品列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个商品
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    const products = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 记录商品浏览
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    const sessionId = req.headers['session-id'] || 'unknown';
    const userId = req.headers['user-id'] || null;

    const viewLog = await query(
      `INSERT INTO product_view_logs
       (user_id, session_id, product_id, category_id, view_time, ip_address)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [userId, sessionId, productId, products[0].category_id, ip]
    );

    res.json({
      ...products[0],
      view_log_id: viewLog.insertId
    });
  } catch (error) {
    logger.error('获取商品详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新商品浏览时长
router.put('/view/:id/duration', async (req, res) => {
  try {
    const { duration_seconds } = req.body;
    const viewId = req.params.id;

    if (!duration_seconds) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    await query(
      'UPDATE product_view_logs SET duration_seconds = ? WHERE id = ?',
      [duration_seconds, viewId]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('更新商品浏览时长失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 按分类获取商品
router.get('/category/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const products = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE p.category_id = ?
       ORDER BY p.created_at DESC`,
      [categoryId]
    );

    res.json(products);
  } catch (error) {
    logger.error('按分类获取商品失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建商品 (需要管理员权限)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, stock, category, image_url } = req.body;

    // 验证必填字段
    if (!name || !price || !category) {
      return res.status(400).json({ message: '名称、价格和分类为必填项' });
    }

    // 创建商品
    const result = await query(
      `INSERT INTO products_product
       (name, description, price, stock, image_url, category_id, merchant_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, description || '', price, stock || 0, image_url || '', category, req.user.id]
    );

    // 记录管理员操作
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'create', `创建商品: ${name}`, 'product', result.insertId, ip]
    );

    // 获取新创建的商品
    const newProduct = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    logger.info(`管理员创建商品成功: ${name}`);

    res.status(201).json(newProduct[0]);
  } catch (error) {
    logger.error('创建商品失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新商品 (需要管理员权限)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, stock, category, image_url } = req.body;

    // 验证商品是否存在
    const existingProduct = await query('SELECT * FROM products_product WHERE id = ?', [productId]);
    if (existingProduct.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查商品是否属于当前商户
    if (!req.user.is_superuser && existingProduct[0].merchant_id && existingProduct[0].merchant_id !== req.user.id) {
      return res.status(403).json({ message: '您没有权限修改此商品' });
    }

    // 更新商品
    await query(
      `UPDATE products_product
       SET name = ?, description = ?, price = ?, stock = ?, image_url = ?,
           category_id = ?, merchant_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name || existingProduct[0].name,
        description !== undefined ? description : existingProduct[0].description,
        price || existingProduct[0].price,
        stock !== undefined ? stock : existingProduct[0].stock,
        image_url || existingProduct[0].image_url,
        category || existingProduct[0].category_id,
        req.user.id, // 设置为当前用户ID
        productId
      ]
    );

    // 记录管理员操作
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新商品: ${name || existingProduct[0].name}`, 'product', productId, ip]
    );

    // 获取更新后的商品
    const updatedProduct = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    logger.info(`管理员更新商品成功: ID=${productId}`);

    res.json(updatedProduct[0]);
  } catch (error) {
    logger.error('更新商品失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除商品 (需要管理员权限)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    // 验证商品是否存在
    const existingProduct = await query('SELECT * FROM products_product WHERE id = ?', [productId]);
    if (existingProduct.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查商品是否属于当前商户
    if (!req.user.is_superuser && existingProduct[0].merchant_id && existingProduct[0].merchant_id !== req.user.id) {
      return res.status(403).json({ message: '您没有权限删除此商品' });
    }

    // 删除商品
    await query('DELETE FROM products_product WHERE id = ?', [productId]);

    // 记录管理员操作
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'delete', `删除商品: ${existingProduct[0].name}`, 'product', productId, ip]
    );

    logger.info(`管理员删除商品成功: ID=${productId}`);

    res.json({ message: '商品已删除' });
  } catch (error) {
    logger.error('删除商品失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
