const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');

// 所有商户库存管理API都需要管理员权限
router.use(authenticateToken, isAdmin);

// 获取商户商品库存列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      page_size = 10, 
      name, 
      category_id, 
      stock_status 
    } = req.query;
    
    // 获取当前商户ID
    const merchantId = req.user.id;
    
    // 构建SQL查询条件
    let whereClause = 'WHERE p.merchant_id = ?';
    let params = [merchantId];
    
    if (name) {
      whereClause += ' AND p.name LIKE ?';
      params.push(`%${name}%`);
    }
    
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    if (stock_status) {
      switch (stock_status) {
        case 'low':
          whereClause += ' AND p.stock <= 5';
          break;
        case 'normal':
          whereClause += ' AND p.stock > 5 AND p.stock <= 20';
          break;
        case 'high':
          whereClause += ' AND p.stock > 20';
          break;
      }
    }
    
    // 计算分页偏移量
    const offset = (page - 1) * page_size;
    
    // 获取商品库存列表
    const productsSql = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        p.price,
        p.stock,
        CASE
          WHEN p.stock <= 5 THEN 'low'
          WHEN p.stock <= 20 THEN 'normal'
          ELSE 'high'
        END as stock_status,
        COALESCE(SUM(oi.quantity), 0) as sales_count
      FROM products_product p
      LEFT JOIN categories_category c ON p.category_id = c.id
      LEFT JOIN orders_orderitem oi ON p.id = oi.product_id
      LEFT JOIN orders_order o ON oi.order_id = o.id AND o.status = 'completed'
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.id
      LIMIT ? OFFSET ?
    `;
    
    // 获取总记录数
    const countSql = `
      SELECT COUNT(*) as total
      FROM products_product p
      ${whereClause}
    `;
    
    // 执行查询
    const productsResult = await query(productsSql, [...params, parseInt(page_size), offset]);
    const countResult = await query(countSql, params);
    
    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户商品库存列表', 'merchant_inventory', ip]
    );
    
    // 返回结果
    res.json({
      results: productsResult,
      total: countResult[0].total,
      page: parseInt(page),
      page_size: parseInt(page_size)
    });
  } catch (error) {
    logger.error('获取商户商品库存列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新商品库存
router.post('/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, remark } = req.body;
    
    // 获取当前商户ID
    const merchantId = req.user.id;
    
    // 验证商品是否属于当前商户
    const checkSql = `
      SELECT id, stock
      FROM products_product
      WHERE id = ? AND merchant_id = ?
    `;
    
    const checkResult = await query(checkSql, [id, merchantId]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({ message: '商品不存在或不属于当前商户' });
    }
    
    const oldStock = checkResult[0].stock;
    const changeAmount = stock - oldStock;
    
    // 更新商品库存
    const updateSql = `
      UPDATE products_product
      SET stock = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [stock, id]);
    
    // 记录库存变更
    const logSql = `
      INSERT INTO inventory_log
      (product_id, change_type, before_stock, after_stock, change_amount, operator_id, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await query(logSql, [id, 'manual', oldStock, stock, changeAmount, req.user.id, remark]);
    
    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新商品库存(ID:${id})从${oldStock}到${stock}`, 'merchant_inventory', id, ip]
    );
    
    // 返回结果
    res.json({ message: '库存更新成功' });
  } catch (error) {
    logger.error('更新商品库存失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商品库存变更记录
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, page_size = 10 } = req.query;
    
    // 获取当前商户ID
    const merchantId = req.user.id;
    
    // 验证商品是否属于当前商户
    const checkSql = `
      SELECT id
      FROM products_product
      WHERE id = ? AND merchant_id = ?
    `;
    
    const checkResult = await query(checkSql, [id, merchantId]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({ message: '商品不存在或不属于当前商户' });
    }
    
    // 计算分页偏移量
    const offset = (page - 1) * page_size;
    
    // 获取库存变更记录
    const historySql = `
      SELECT 
        l.id,
        l.change_type,
        l.before_stock,
        l.after_stock,
        l.change_amount,
        l.operator_id,
        u.username as operator_name,
        l.remark,
        l.created_at
      FROM inventory_log l
      LEFT JOIN user_auth_simpleuser u ON l.operator_id = u.id
      WHERE l.product_id = ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // 获取总记录数
    const countSql = `
      SELECT COUNT(*) as total
      FROM inventory_log
      WHERE product_id = ?
    `;
    
    // 执行查询
    const historyResult = await query(historySql, [id, parseInt(page_size), offset]);
    const countResult = await query(countSql, [id]);
    
    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查看商品库存变更记录(ID:${id})`, 'merchant_inventory', id, ip]
    );
    
    // 返回结果
    res.json({
      results: historyResult,
      total: countResult[0].total,
      page: parseInt(page),
      page_size: parseInt(page_size)
    });
  } catch (error) {
    logger.error('获取商品库存变更记录失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
