const express = require('express');
const router = express.Router();
const { query, pool } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');

// 获取商户的所有分类
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 获取当前商户ID
    const merchantId = req.user.id;

    // 查询当前商户的分类
    const categories = await query(
      'SELECT * FROM categories_category WHERE merchant_id = ? ORDER BY name LIMIT ? OFFSET ?',
      [merchantId, parseInt(limit), parseInt(offset)]
    );

    // 获取总数
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM categories_category WHERE merchant_id = ?',
      [merchantId]
    );
    const total = totalResult[0].total;

    // 获取每个分类的商品数量
    const categoriesWithCount = await Promise.all(categories.map(async (category) => {
      const countResult = await query(
        'SELECT COUNT(*) as count FROM products_product WHERE category_id = ? AND merchant_id = ?',
        [category.id, merchantId]
      );

      return {
        ...category,
        product_count: countResult[0].count
      };
    }));

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询商户分类列表', 'merchant_category', ip]
    );

    res.json({
      items: categoriesWithCount,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('获取商户分类列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户分类详情
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const merchantId = req.user.id;

    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: '分类不存在或不属于当前商户' });
    }

    // 获取分类下的商品数量
    const countResult = await query(
      'SELECT COUNT(*) as count FROM products_product WHERE category_id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查看商户分类详情: ID=${categoryId}`, 'merchant_category', categoryId, ip]
    );

    res.json({
      ...categories[0],
      product_count: countResult[0].count
    });
  } catch (error) {
    logger.error('获取商户分类详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 创建商户分类
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const merchantId = req.user.id;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '分类名称为必填项' });
    }

    // 检查分类名称是否已存在（在当前商户下）
    const existingCategories = await query(
      'SELECT * FROM categories_category WHERE name = ? AND merchant_id = ?',
      [name, merchantId]
    );

    if (existingCategories.length > 0) {
      return res.status(400).json({ message: '分类名称已存在' });
    }

    // 创建分类
    const result = await query(
      'INSERT INTO categories_category (name, description, merchant_id) VALUES (?, ?, ?)',
      [name, description || '', merchantId]
    );

    const categoryId = result.insertId;

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'create', `创建商户分类: ${name}`, 'merchant_category', categoryId, ip]
    );

    // 获取创建的分类
    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    logger.info(`商户创建分类: ID=${categoryId}, 名称=${name}, 商户ID=${merchantId}`);

    res.status(201).json(categories[0]);
  } catch (error) {
    logger.error('创建商户分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新商户分类
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    const merchantId = req.user.id;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '分类名称为必填项' });
    }

    // 验证分类是否存在且属于当前商户
    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: '分类不存在或不属于当前商户' });
    }

    // 检查分类名称是否已存在（排除当前分类，但仍在当前商户下）
    const existingCategories = await query(
      'SELECT * FROM categories_category WHERE name = ? AND id != ? AND merchant_id = ?',
      [name, categoryId, merchantId]
    );

    if (existingCategories.length > 0) {
      return res.status(400).json({ message: '分类名称已存在' });
    }

    // 更新分类
    await query(
      'UPDATE categories_category SET name = ?, description = ? WHERE id = ? AND merchant_id = ?',
      [name, description || '', categoryId, merchantId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新商户分类: ID=${categoryId}, 名称=${name}`, 'merchant_category', categoryId, ip]
    );

    // 获取更新后的分类
    const updatedCategories = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    logger.info(`商户更新分类: ID=${categoryId}, 名称=${name}, 商户ID=${merchantId}`);

    res.json(updatedCategories[0]);
  } catch (error) {
    logger.error('更新商户分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 删除商户分类
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const merchantId = req.user.id;

    // 验证分类是否存在且属于当前商户
    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: '分类不存在或不属于当前商户' });
    }

    // 检查分类下是否有商品
    const products = await query(
      'SELECT COUNT(*) as count FROM products_product WHERE category_id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ message: '无法删除有商品的分类' });
    }

    // 删除分类
    await query(
      'DELETE FROM categories_category WHERE id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'delete', `删除商户分类: ID=${categoryId}, 名称=${categories[0].name}`, 'merchant_category', categoryId, ip]
    );

    logger.info(`商户删除分类: ID=${categoryId}, 名称=${categories[0].name}, 商户ID=${merchantId}`);

    res.json({ message: '分类已删除' });
  } catch (error) {
    logger.error('删除商户分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;