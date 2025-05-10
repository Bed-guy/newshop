const express = require('express');
const router = express.Router();
const { query, pool } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');

// 获取所有商品（管理员）
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
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
    
    // 根据当前登录的商户ID过滤商品
    // 只有超级管理员可以查看所有商品，普通商户只能查看自己的商品
    if (!req.user.is_superuser) {
      sql += ' AND p.merchant_id = ?';
      params.push(req.user.id);
    }
    
    // 获取总数
    let countSql = `
      SELECT COUNT(*) as total 
      FROM products_product p
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (category) {
      countSql += ' AND p.category_id = ?';
      countParams.push(category);
    }
    
    if (search) {
      countSql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    // 根据当前登录的商户ID过滤商品计数
    if (!req.user.is_superuser) {
      countSql += ' AND p.merchant_id = ?';
      countParams.push(req.user.id);
    }
    
    // 添加排序和分页
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const products = await query(sql, params);
    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;
    
    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询商品列表', 'product', ip]
    );
    
    res.json({
      items: products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('获取商品列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建商品（管理员）
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, stock, category_id, image_url } = req.body;
    
    // 验证必填字段
    if (!name || !price || !category_id) {
      return res.status(400).json({ message: '名称、价格和分类为必填项' });
    }
    
    // 创建商品
    const result = await query(
      `INSERT INTO products_product 
       (name, description, price, stock, image_url, category_id, merchant_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, description || '', price, stock || 0, image_url || '', category_id, req.user.id]
    );
    
    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
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

module.exports = router;
