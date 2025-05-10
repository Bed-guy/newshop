const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../utils/auth');
const logger = require('../logger');

/**
 * @api {get} /api/cart 获取购物车
 * @apiName GetCart
 * @apiGroup Cart
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Object[]} items 购物车商品列表
 * @apiSuccess {Number} total_price 总价
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取购物车商品
    const cartItems = await query(
      `SELECT sc.id, sc.product_id, sc.quantity, sc.created_at, sc.updated_at,
              p.name, p.price, p.image_url, p.stock, c.name as category_name
       FROM shopping_cart sc
       JOIN products_product p ON sc.product_id = p.id
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE sc.user_id = ?
       ORDER BY sc.created_at DESC`,
      [userId]
    );
    
    // 计算总价
    const totalPrice = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    res.json({
      items: cartItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.name,
        price: parseFloat(item.price),
        image_url: item.image_url,
        stock: item.stock,
        category_name: item.category_name,
        total_item_price: parseFloat(item.price) * item.quantity
      })),
      total_price: totalPrice.toFixed(2)
    });
  } catch (error) {
    logger.error('获取购物车失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {post} /api/cart/add 添加商品到购物车
 * @apiName AddToCart
 * @apiGroup Cart
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {Number} product_id 商品ID
 * @apiParam {Number} quantity 数量
 * @apiSuccess {Object} item 添加的商品信息
 */
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.id;
    
    // 验证必填字段
    if (!product_id) {
      return res.status(400).json({ message: '商品ID为必填项' });
    }
    
    // 验证商品是否存在
    const products = await query(
      'SELECT * FROM products_product WHERE id = ?',
      [product_id]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }
    
    const product = products[0];
    
    // 验证库存是否充足
    if (product.stock < quantity) {
      return res.status(400).json({ message: '商品库存不足' });
    }
    
    // 检查购物车中是否已有该商品
    const existingItems = await query(
      'SELECT * FROM shopping_cart WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );
    
    if (existingItems.length > 0) {
      // 更新数量
      const newQuantity = existingItems[0].quantity + parseInt(quantity);
      
      // 再次验证库存是否充足
      if (product.stock < newQuantity) {
        return res.status(400).json({ message: '商品库存不足' });
      }
      
      await query(
        'UPDATE shopping_cart SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );
      
      // 获取更新后的购物车商品
      const updatedItem = await query(
        `SELECT sc.*, p.name, p.price, p.image_url, p.stock
         FROM shopping_cart sc
         JOIN products_product p ON sc.product_id = p.id
         WHERE sc.id = ?`,
        [existingItems[0].id]
      );
      
      res.json({
        id: updatedItem[0].id,
        product_id: updatedItem[0].product_id,
        quantity: updatedItem[0].quantity,
        name: updatedItem[0].name,
        price: parseFloat(updatedItem[0].price),
        image_url: updatedItem[0].image_url,
        stock: updatedItem[0].stock,
        total_item_price: parseFloat(updatedItem[0].price) * updatedItem[0].quantity
      });
    } else {
      // 添加新商品
      const result = await query(
        'INSERT INTO shopping_cart (user_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [userId, product_id, quantity]
      );
      
      // 获取新添加的购物车商品
      const newItem = await query(
        `SELECT sc.*, p.name, p.price, p.image_url, p.stock
         FROM shopping_cart sc
         JOIN products_product p ON sc.product_id = p.id
         WHERE sc.id = ?`,
        [result.insertId]
      );
      
      res.status(201).json({
        id: newItem[0].id,
        product_id: newItem[0].product_id,
        quantity: newItem[0].quantity,
        name: newItem[0].name,
        price: parseFloat(newItem[0].price),
        image_url: newItem[0].image_url,
        stock: newItem[0].stock,
        total_item_price: parseFloat(newItem[0].price) * newItem[0].quantity
      });
    }
  } catch (error) {
    logger.error('添加商品到购物车失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {put} /api/cart/:id 更新购物车商品数量
 * @apiName UpdateCartItem
 * @apiGroup Cart
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {Number} id 购物车商品ID
 * @apiParam {Number} quantity 新数量
 * @apiSuccess {Object} item 更新后的商品信息
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { quantity } = req.body;
    const userId = req.user.id;
    
    // 验证必填字段
    if (!quantity) {
      return res.status(400).json({ message: '数量为必填项' });
    }
    
    // 验证购物车商品是否存在且属于当前用户
    const cartItems = await query(
      'SELECT * FROM shopping_cart WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );
    
    if (cartItems.length === 0) {
      return res.status(404).json({ message: '购物车商品不存在或无权访问' });
    }
    
    // 验证商品库存是否充足
    const products = await query(
      'SELECT * FROM products_product WHERE id = ?',
      [cartItems[0].product_id]
    );
    
    if (products[0].stock < quantity) {
      return res.status(400).json({ message: '商品库存不足' });
    }
    
    // 更新数量
    await query(
      'UPDATE shopping_cart SET quantity = ?, updated_at = NOW() WHERE id = ?',
      [quantity, itemId]
    );
    
    // 获取更新后的购物车商品
    const updatedItem = await query(
      `SELECT sc.*, p.name, p.price, p.image_url, p.stock
       FROM shopping_cart sc
       JOIN products_product p ON sc.product_id = p.id
       WHERE sc.id = ?`,
      [itemId]
    );
    
    res.json({
      id: updatedItem[0].id,
      product_id: updatedItem[0].product_id,
      quantity: updatedItem[0].quantity,
      name: updatedItem[0].name,
      price: parseFloat(updatedItem[0].price),
      image_url: updatedItem[0].image_url,
      stock: updatedItem[0].stock,
      total_item_price: parseFloat(updatedItem[0].price) * updatedItem[0].quantity
    });
  } catch (error) {
    logger.error('更新购物车商品数量失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {delete} /api/cart/:id 删除购物车商品
 * @apiName RemoveCartItem
 * @apiGroup Cart
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {Number} id 购物车商品ID
 * @apiSuccess {Object} message 成功消息
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;
    
    // 验证购物车商品是否存在且属于当前用户
    const cartItems = await query(
      'SELECT * FROM shopping_cart WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );
    
    if (cartItems.length === 0) {
      return res.status(404).json({ message: '购物车商品不存在或无权访问' });
    }
    
    // 删除购物车商品
    await query('DELETE FROM shopping_cart WHERE id = ?', [itemId]);
    
    res.json({ message: '购物车商品已删除' });
  } catch (error) {
    logger.error('删除购物车商品失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {delete} /api/cart 清空购物车
 * @apiName ClearCart
 * @apiGroup Cart
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Object} message 成功消息
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 删除用户的所有购物车商品
    await query('DELETE FROM shopping_cart WHERE user_id = ?', [userId]);
    
    res.json({ message: '购物车已清空' });
  } catch (error) {
    logger.error('清空购物车失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
