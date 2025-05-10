const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken } = require('../../utils/auth');
const logger = require('../../logger');

// 所有库存管理API都需要管理员权限
router.use(authenticateToken);

// 获取库存列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      page_size = 10, 
      name, 
      category, 
      stock_status 
    } = req.query;
    
    const offset = (page - 1) * page_size;
    
    // 构建SQL查询
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.image_url,
        p.created_at,
        p.updated_at,
        c.id as category_id,
        c.name as category_name,
        p.merchant_id,
        m.username as merchant_name,
        CASE
          WHEN p.stock = 0 THEN 'out_of_stock'
          WHEN p.stock < 10 THEN 'low'
          WHEN p.stock < 50 THEN 'normal'
          ELSE 'high'
        END as stock_status
      FROM 
        products_product p
      LEFT JOIN 
        categories_category c ON p.category_id = c.id
      LEFT JOIN
        user_auth_simpleuser m ON p.merchant_id = m.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // 如果不是超级管理员，只显示该商户的商品
    if (!req.user.is_superuser && req.user.id !== 11) {
      sql += ' AND p.merchant_id = ?';
      params.push(req.user.id);
    } else if (req.query.merchant_id) {
      // 如果是超级管理员且指定了商户ID，则按商户ID筛选
      sql += ' AND p.merchant_id = ?';
      params.push(req.query.merchant_id);
    }
    
    // 按商品名称筛选
    if (name) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${name}%`);
    }
    
    // 按分类筛选
    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }
    
    // 按库存状态筛选
    if (stock_status) {
      switch (stock_status) {
        case 'out_of_stock':
          sql += ' AND p.stock = 0';
          break;
        case 'low':
          sql += ' AND p.stock > 0 AND p.stock < 10';
          break;
        case 'normal':
          sql += ' AND p.stock >= 10 AND p.stock < 50';
          break;
        case 'high':
          sql += ' AND p.stock >= 50';
          break;
      }
    }
    
    // 获取总数
    const countSql = sql.replace(/SELECT.*?FROM/s, 'SELECT COUNT(*) as total FROM');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;
    
    // 添加排序和分页
    sql += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), offset);
    
    // 执行查询
    const products = await query(sql, params);
    
    // 获取所有分类
    const categories = await query('SELECT id, name FROM categories_category');
    
    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询库存列表', 'inventory', ip]
    );
    
    res.json({
      total,
      page: parseInt(page),
      page_size: parseInt(page_size),
      categories,
      results: products
    });
  } catch (error) {
    logger.error('获取库存列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新商品库存
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, price, remark } = req.body;
    
    // 验证商品是否存在
    const products = await query('SELECT * FROM products_product WHERE id = ?', [id]);
    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }
    
    const product = products[0];
    
    // 如果不是超级管理员，检查是否有权限修改
    if (!req.user.is_superuser && req.user.id !== 11 && product.merchant_id !== req.user.id) {
      return res.status(403).json({ message: '无权修改此商品库存' });
    }
    
    // 开始事务
    const connection = await require('../../db').getConnection();
    await connection.beginTransaction();
    
    try {
      // 记录库存变更前的数据
      const oldStock = product.stock;
      const oldPrice = product.price;
      
      // 更新商品库存和价格
      const updateFields = [];
      const updateParams = [];
      
      if (stock !== undefined) {
        updateFields.push('stock = ?');
        updateParams.push(stock);
      }
      
      if (price !== undefined) {
        updateFields.push('price = ?');
        updateParams.push(price);
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateParams.push(id);
        
        await connection.query(
          `UPDATE products_product SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );
        
        // 记录库存变更日志
        if (stock !== undefined && stock !== oldStock) {
          await connection.query(
            `INSERT INTO inventory_logs
             (product_id, old_quantity, new_quantity, change_type, change_reason, operator_id, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              id,
              oldStock,
              stock,
              stock > oldStock ? 'increase' : 'decrease',
              remark || '手动调整',
              req.user.id
            ]
          );
        }
        
        // 记录价格变更日志
        if (price !== undefined && price !== oldPrice) {
          await connection.query(
            `INSERT INTO price_change_logs
             (product_id, old_price, new_price, change_reason, operator_id, timestamp)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              id,
              oldPrice,
              price,
              remark || '手动调整',
              req.user.id
            ]
          );
        }
      }
      
      // 提交事务
      await connection.commit();
      
      // 获取更新后的商品信息
      const updatedProduct = await query('SELECT * FROM products_product WHERE id = ?', [id]);
      
      // 记录管理员操作日志
      const ip = req.ip || req.socket.remoteAddress;
      await query(
        `INSERT INTO admin_operation_logs
         (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [req.user.id, 'update', `更新商品库存: ${product.name}`, 'inventory', id, ip]
      );
      
      res.json({
        message: '库存更新成功',
        product: updatedProduct[0]
      });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (error) {
    logger.error('更新库存失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 批量更新库存
router.post('/batch-update', async (req, res) => {
  try {
    const { products, remark } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: '无效的请求数据' });
    }
    
    // 开始事务
    const connection = await require('../../db').getConnection();
    await connection.beginTransaction();
    
    try {
      const results = [];
      
      for (const item of products) {
        const { id, stock, price } = item;
        
        // 验证商品是否存在
        const [productRows] = await connection.query('SELECT * FROM products_product WHERE id = ?', [id]);
        if (productRows.length === 0) {
          continue; // 跳过不存在的商品
        }
        
        const product = productRows[0];
        
        // 如果不是超级管理员，检查是否有权限修改
        if (!req.user.is_superuser && req.user.id !== 11 && product.merchant_id !== req.user.id) {
          continue; // 跳过无权修改的商品
        }
        
        // 记录库存变更前的数据
        const oldStock = product.stock;
        const oldPrice = product.price;
        
        // 更新商品库存和价格
        const updateFields = [];
        const updateParams = [];
        
        if (stock !== undefined) {
          updateFields.push('stock = ?');
          updateParams.push(stock);
        }
        
        if (price !== undefined) {
          updateFields.push('price = ?');
          updateParams.push(price);
        }
        
        if (updateFields.length > 0) {
          updateFields.push('updated_at = NOW()');
          updateParams.push(id);
          
          await connection.query(
            `UPDATE products_product SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
          );
          
          // 记录库存变更日志
          if (stock !== undefined && stock !== oldStock) {
            await connection.query(
              `INSERT INTO inventory_logs
               (product_id, old_quantity, new_quantity, change_type, change_reason, operator_id, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, NOW())`,
              [
                id,
                oldStock,
                stock,
                stock > oldStock ? 'increase' : 'decrease',
                remark || '批量调整',
                req.user.id
              ]
            );
          }
          
          // 记录价格变更日志
          if (price !== undefined && price !== oldPrice) {
            await connection.query(
              `INSERT INTO price_change_logs
               (product_id, old_price, new_price, change_reason, operator_id, timestamp)
               VALUES (?, ?, ?, ?, ?, NOW())`,
              [
                id,
                oldPrice,
                price,
                remark || '批量调整',
                req.user.id
              ]
            );
          }
          
          results.push({
            id,
            success: true,
            message: '更新成功'
          });
        }
      }
      
      // 提交事务
      await connection.commit();
      
      // 记录管理员操作日志
      const ip = req.ip || req.socket.remoteAddress;
      await query(
        `INSERT INTO admin_operation_logs
         (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [req.user.id, 'update', `批量更新商品库存: ${results.length}个商品`, 'inventory', ip]
      );
      
      res.json({
        message: '批量更新成功',
        results
      });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (error) {
    logger.error('批量更新库存失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
