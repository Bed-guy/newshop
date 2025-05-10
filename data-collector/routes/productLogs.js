const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../logger');
const { getRealIp } = require('../utils/ip');

// 记录商品浏览
router.post('/view', async (req, res) => {
  try {
    const {
      user_id,
      session_id,
      product_id,
      category_id,
      duration_seconds,
      ip_address
    } = req.body;

    if (!session_id || !product_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 如果前端没有提供IP地址，则从请求中获取
    const realIpAddress = ip_address || getRealIp(req);

    const [result] = await pool.query(
      `INSERT INTO product_view_logs
       (user_id, session_id, product_id, category_id, view_time, duration_seconds, ip_address)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [user_id || null, session_id, product_id, category_id || null, duration_seconds || 0, realIpAddress]
    );

    logger.info(`商品 ${product_id} 被浏览，用户: ${user_id || '未登录'}, 停留时间: ${duration_seconds || 0}秒`);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    logger.error('记录商品浏览失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新商品浏览时长
router.put('/view/:id/duration', async (req, res) => {
  try {
    const { duration_seconds } = req.body;
    const id = req.params.id;

    if (!duration_seconds) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    await pool.query(
      'UPDATE product_view_logs SET duration_seconds = ? WHERE id = ?',
      [duration_seconds, id]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('更新商品浏览时长失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取商品浏览统计
router.get('/stats/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as view_count,
        AVG(duration_seconds) as avg_duration,
        MAX(duration_seconds) as max_duration,
        MIN(duration_seconds) as min_duration
       FROM product_view_logs
       WHERE product_id = ?`,
      [productId]
    );

    res.json(rows[0]);
  } catch (error) {
    logger.error('获取商品浏览统计失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取分类浏览统计
router.get('/stats/category/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as view_count,
        AVG(duration_seconds) as avg_duration
       FROM product_view_logs
       WHERE category_id = ?`,
      [categoryId]
    );

    res.json(rows[0]);
  } catch (error) {
    logger.error('获取分类浏览统计失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
