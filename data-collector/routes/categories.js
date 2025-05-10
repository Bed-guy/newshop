const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, isAdmin } = require('../utils/auth');
const logger = require('../logger');

// 获取所有分类
router.get('/', async (req, res) => {
  try {
    // 检查是否有merchant_id参数
    const merchantId = req.query.merchant_id;

    let categories;

    if (merchantId) {
      // 如果提供了merchant_id，只返回该商户的分类
      categories = await query(
        'SELECT * FROM categories_category WHERE merchant_id = ? ORDER BY name',
        [merchantId]
      );
    } else {
      // 否则返回所有分类
      categories = await query(
        'SELECT * FROM categories_category ORDER BY name'
      );
    }

    res.json(categories);
  } catch (error) {
    logger.error('获取分类列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取按商户分组的分类
router.get('/by-merchant', async (req, res) => {
  try {
    // 获取所有商户
    const merchants = await query(
      `SELECT id, username
       FROM user_auth_simpleuser
       WHERE is_staff = 1 OR is_superuser = 1
       ORDER BY username`
    );

    // 获取每个商户的分类
    const result = await Promise.all(merchants.map(async (merchant) => {
      const categories = await query(
        `SELECT c.*
         FROM categories_category c
         WHERE c.merchant_id = ?
         ORDER BY c.name`,
        [merchant.id]
      );

      return {
        merchant_id: merchant.id,
        merchant_name: merchant.username,
        categories: categories
      };
    }));

    // 过滤掉没有分类的商户
    const filteredResult = result.filter(item => item.categories.length > 0);

    res.json(filteredResult);
  } catch (error) {
    logger.error('获取按商户分组的分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取顶级分类
router.get('/root', async (req, res) => {
  try {
    const categories = await query(
      'SELECT * FROM categories_category WHERE parent_id IS NULL ORDER BY name'
    );

    res.json(categories);
  } catch (error) {
    logger.error('获取顶级分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个分类及其子分类
router.get('/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;

    // 获取分类信息
    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 获取子分类
    const children = await query(
      'SELECT * FROM categories_category WHERE parent_id = ? ORDER BY name',
      [categoryId]
    );

    res.json({
      ...categories[0],
      children
    });
  } catch (error) {
    logger.error('获取分类详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建分类 (需要管理员权限)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, parent } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '名称为必填项' });
    }

    // 检查名称是否已存在
    const existingCategory = await query(
      'SELECT * FROM categories_category WHERE name = ?',
      [name]
    );

    if (existingCategory.length > 0) {
      return res.status(400).json({ message: '分类名称已存在' });
    }

    // 创建分类
    const result = await query(
      `INSERT INTO categories_category
       (name, description, parent_id, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [name, description || null, parent || null]
    );

    // 记录管理员操作
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'create', `创建分类: ${name}`, 'category', result.insertId, ip]
    );

    // 获取新创建的分类
    const newCategory = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [result.insertId]
    );

    logger.info(`管理员创建分类成功: ${name}`);

    res.status(201).json(newCategory[0]);
  } catch (error) {
    logger.error('创建分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新分类 (需要管理员权限)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, parent } = req.body;

    // 验证分类是否存在
    const existingCategory = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 如果更改了名称，检查是否与其他分类重名
    if (name && name !== existingCategory[0].name) {
      const duplicateName = await query(
        'SELECT * FROM categories_category WHERE name = ? AND id != ?',
        [name, categoryId]
      );

      if (duplicateName.length > 0) {
        return res.status(400).json({ message: '分类名称已存在' });
      }
    }

    // 更新分类
    await query(
      `UPDATE categories_category
       SET name = ?, description = ?, parent_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name || existingCategory[0].name,
        description !== undefined ? description : existingCategory[0].description,
        parent !== undefined ? parent : existingCategory[0].parent_id,
        categoryId
      ]
    );

    // 记录管理员操作
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新分类: ${name || existingCategory[0].name}`, 'category', categoryId, ip]
    );

    // 获取更新后的分类
    const updatedCategory = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    logger.info(`管理员更新分类成功: ID=${categoryId}`);

    res.json(updatedCategory[0]);
  } catch (error) {
    logger.error('更新分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除分类 (需要管理员权限)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // 验证分类是否存在
    const existingCategory = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 检查是否有子分类
    const children = await query(
      'SELECT * FROM categories_category WHERE parent_id = ?',
      [categoryId]
    );

    if (children.length > 0) {
      return res.status(400).json({ message: '无法删除含有子分类的分类' });
    }

    // 检查是否有关联的商品
    const products = await query(
      'SELECT * FROM products_product WHERE category_id = ?',
      [categoryId]
    );

    if (products.length > 0) {
      return res.status(400).json({ message: '无法删除含有商品的分类' });
    }

    // 删除分类
    await query('DELETE FROM categories_category WHERE id = ?', [categoryId]);

    // 记录管理员操作
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'delete', `删除分类: ${existingCategory[0].name}`, 'category', categoryId, ip]
    );

    logger.info(`管理员删除分类成功: ID=${categoryId}`);

    res.json({ message: '分类已删除' });
  } catch (error) {
    logger.error('删除分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
