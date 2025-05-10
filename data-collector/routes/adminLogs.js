const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../logger');

// 记录管理员操作
router.post('/', async (req, res) => {
  try {
    const { 
      admin_id, 
      operation_type, 
      operation_content, 
      object_type, 
      object_id, 
      ip_address 
    } = req.body;
    
    if (!admin_id || !operation_type || !operation_content || !object_type || !ip_address) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 验证操作类型
    const validOperationTypes = ['query', 'create', 'update', 'delete'];
    if (!validOperationTypes.includes(operation_type)) {
      return res.status(400).json({ error: '无效的操作类型' });
    }
    
    const [result] = await pool.query(
      `INSERT INTO admin_operation_logs 
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [admin_id, operation_type, operation_content, object_type, object_id || null, ip_address]
    );
    
    logger.info(`管理员 ${admin_id} 执行 ${operation_type} 操作，对象类型: ${object_type}，对象ID: ${object_id || 'N/A'}`);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    logger.error('记录管理员操作失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取管理员操作日志
router.get('/:adminId', async (req, res) => {
  try {
    const adminId = req.params.adminId;
    
    const [rows] = await pool.query(
      `SELECT * FROM admin_operation_logs 
       WHERE admin_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 100`,
      [adminId]
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取管理员操作日志失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取所有管理员操作日志
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, operation_type, object_type } = req.query;
    
    let query = 'SELECT * FROM admin_operation_logs WHERE 1=1';
    const params = [];
    
    if (operation_type) {
      query += ' AND operation_type = ?';
      params.push(operation_type);
    }
    
    if (object_type) {
      query += ' AND object_type = ?';
      params.push(object_type);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (error) {
    logger.error('获取所有管理员操作日志失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取操作统计
router.get('/stats/operations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        operation_type, 
        COUNT(*) as count 
       FROM admin_operation_logs 
       GROUP BY operation_type`
    );
    
    res.json(rows);
  } catch (error) {
    logger.error('获取操作统计失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
