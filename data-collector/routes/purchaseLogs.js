const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../logger');

// 记录购买
router.post('/', async (req, res) => {
  try {
    const { 
      user_id, 
      product_id, 
      category_id, 
      unit_price, 
      quantity,
      order_id
    } = req.body;
    
    if (!user_id || !product_id || !unit_price || !quantity) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const total_price = parseFloat(unit_price) * parseInt(quantity);
    
    const [result] = await pool.query(
      `INSERT INTO purchase_logs 
       (user_id, product_id, category_id, purchase_date, unit_price, quantity, total_price, order_id) 
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [user_id, product_id, category_id || null, unit_price, quantity, total_price, order_id || null]
    );
    
    logger.info(`用户 ${user_id} 购买商品 ${product_id}，数量: ${quantity}，总价: ${total_price}`);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    logger.error('记录购买失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量记录购买（处理整个订单）
router.post('/batch', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { user_id, order_id, items } = req.body;
    
    if (!user_id || !order_id || !items || !items.length) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const results = [];
    
    for (const item of items) {
      const { product_id, category_id, unit_price, quantity } = item;
      const total_price = parseFloat(unit_price) * parseInt(quantity);
      
      const [result] = await connection.query(
        `INSERT INTO purchase_logs 
         (user_id, product_id, category_id, purchase_date, unit_price, quantity, total_price, order_id) 
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [user_id, product_id, category_id || null, unit_price, quantity, total_price, order_id]
      );
      
      results.push({
        id: result.insertId,
        product_id,
        quantity,
        total_price
      });
    }
    
    await connection.commit();
    
    logger.info(`用户 ${user_id} 创建订单 ${order_id}，包含 ${items.length} 件商品`);
    res.status(201).json({ success: true, items: results });
  } catch (error) {
    await connection.rollback();
    logger.error('批量记录购买失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  } finally {
    connection.release();
  }
});

// 获取用户购买历史
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const [rows] = await pool.query(
      `SELECT * FROM purchase_logs 
       WHERE user_id = ? 
       ORDER BY purchase_date DESC`,
      [userId]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取用户购买历史失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取商品购买统计
router.get('/stats/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as purchase_count,
        SUM(quantity) as total_quantity,
        SUM(total_price) as total_revenue,
        AVG(unit_price) as avg_price
       FROM purchase_logs 
       WHERE product_id = ?`,
      [productId]
    );
    
    res.json(rows[0]);
  } catch (error) {
    logger.error('获取商品购买统计失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
