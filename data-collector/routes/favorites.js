const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../utils/auth');
const logger = require('../logger');

// 获取用户收藏的商品列表
router.get('/wish', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 查询用户收藏的商品
    const wishItems = await query(
      `SELECT p.*, c.name as category_name 
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       INNER JOIN user_wish_list w ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );
    
    // 格式化响应
    const formattedItems = wishItems.map(item => ({
      id: item.id,
      title: item.name,
      price: parseFloat(item.price),
      stock: item.stock,
      description: item.description,
      image_url: item.image_url,
      category_id: item.category_id,
      category_name: item.category_name,
      created_at: item.created_at
    }));
    
    res.json(formattedItems);
  } catch (error) {
    logger.error('获取收藏列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加商品到收藏
router.post('/wish/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ message: '缺少商品ID' });
    }
    
    // 检查商品是否存在
    const products = await query('SELECT * FROM products_product WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }
    
    // 检查是否已经收藏
    const existingWish = await query(
      'SELECT * FROM user_wish_list WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );
    
    if (existingWish.length > 0) {
      return res.status(400).json({ message: '已经收藏过该商品' });
    }
    
    // 添加到收藏
    await query(
      'INSERT INTO user_wish_list (user_id, product_id, created_at) VALUES (?, ?, NOW())',
      [userId, product_id]
    );
    
    res.status(201).json({ message: '添加收藏成功' });
  } catch (error) {
    logger.error('添加收藏失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 从收藏中移除商品
router.post('/wish/remove', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ message: '缺少商品ID' });
    }
    
    // 从收藏中移除
    await query(
      'DELETE FROM user_wish_list WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );
    
    res.json({ message: '移除收藏成功' });
  } catch (error) {
    logger.error('移除收藏失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户收藏夹中的商品列表
router.get('/collect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 查询用户收藏夹中的商品
    const collectItems = await query(
      `SELECT p.*, c.name as category_name 
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       INNER JOIN user_collection w ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );
    
    // 格式化响应
    const formattedItems = collectItems.map(item => ({
      id: item.id,
      title: item.name,
      price: parseFloat(item.price),
      stock: item.stock,
      description: item.description,
      image_url: item.image_url,
      category_id: item.category_id,
      category_name: item.category_name,
      created_at: item.created_at
    }));
    
    res.json(formattedItems);
  } catch (error) {
    logger.error('获取收藏夹列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加商品到收藏夹
router.post('/collect/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ message: '缺少商品ID' });
    }
    
    // 检查商品是否存在
    const products = await query('SELECT * FROM products_product WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }
    
    // 检查是否已经在收藏夹中
    const existingCollect = await query(
      'SELECT * FROM user_collection WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );
    
    if (existingCollect.length > 0) {
      return res.status(400).json({ message: '已经添加到收藏夹' });
    }
    
    // 添加到收藏夹
    await query(
      'INSERT INTO user_collection (user_id, product_id, created_at) VALUES (?, ?, NOW())',
      [userId, product_id]
    );
    
    res.status(201).json({ message: '添加到收藏夹成功' });
  } catch (error) {
    logger.error('添加到收藏夹失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 从收藏夹中移除商品
router.post('/collect/remove', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ message: '缺少商品ID' });
    }
    
    // 从收藏夹中移除
    await query(
      'DELETE FROM user_collection WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );
    
    res.json({ message: '从收藏夹移除成功' });
  } catch (error) {
    logger.error('从收藏夹移除失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
