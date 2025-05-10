const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../logger');
const moment = require('moment');

// 获取用户活跃度统计（登录次数）
router.get('/user-activity', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
    
    const [rows] = await pool.query(
      `SELECT 
        DATE(timestamp) as date, 
        COUNT(*) as login_count 
       FROM user_login_logs 
       WHERE action = 'login' AND timestamp >= ? 
       GROUP BY DATE(timestamp) 
       ORDER BY date`,
      [startDate]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取用户活跃度统计失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取商品浏览量排行
router.get('/product-views', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [rows] = await pool.query(
      `SELECT 
        product_id, 
        COUNT(*) as view_count,
        AVG(duration_seconds) as avg_duration
       FROM product_view_logs 
       GROUP BY product_id 
       ORDER BY view_count DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取商品浏览量排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取分类浏览量排行
router.get('/category-views', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        category_id, 
        COUNT(*) as view_count,
        AVG(duration_seconds) as avg_duration
       FROM product_view_logs 
       WHERE category_id IS NOT NULL
       GROUP BY category_id 
       ORDER BY view_count DESC`
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取分类浏览量排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取销售额统计
router.get('/sales', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
    
    const [rows] = await pool.query(
      `SELECT 
        DATE(purchase_date) as date, 
        SUM(total_price) as total_sales,
        COUNT(DISTINCT user_id) as customer_count,
        COUNT(DISTINCT order_id) as order_count
       FROM purchase_logs 
       WHERE purchase_date >= ? 
       GROUP BY DATE(purchase_date) 
       ORDER BY date`,
      [startDate]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取销售额统计失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取商品销量排行
router.get('/product-sales', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [rows] = await pool.query(
      `SELECT 
        product_id, 
        SUM(quantity) as total_quantity,
        SUM(total_price) as total_revenue,
        COUNT(DISTINCT order_id) as order_count
       FROM purchase_logs 
       GROUP BY product_id 
       ORDER BY total_quantity DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取商品销量排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户购买力排行
router.get('/user-purchases', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [rows] = await pool.query(
      `SELECT 
        user_id, 
        COUNT(DISTINCT order_id) as order_count,
        SUM(total_price) as total_spent
       FROM purchase_logs 
       GROUP BY user_id 
       ORDER BY total_spent DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取用户购买力排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
