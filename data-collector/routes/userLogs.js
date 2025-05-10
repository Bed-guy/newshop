const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../logger');
const { getRealIp } = require('../utils/ip');

// 记录用户登录
router.post('/login', async (req, res) => {
  try {
    const { user_id, ip_address, user_agent } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 如果前端没有提供IP地址，则从请求中获取
    const realIpAddress = ip_address || getRealIp(req);

    const [result] = await pool.query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [user_id, 'login', realIpAddress, user_agent]
    );

    logger.info(`用户 ${user_id} 登录，IP: ${realIpAddress}`);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    logger.error('记录用户登录失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 记录用户登出
router.post('/logout', async (req, res) => {
  try {
    const { user_id, ip_address, user_agent } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 如果前端没有提供IP地址，则从请求中获取
    const realIpAddress = ip_address || getRealIp(req);

    const [result] = await pool.query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [user_id, 'logout', realIpAddress, user_agent]
    );

    logger.info(`用户 ${user_id} 登出，IP: ${realIpAddress}`);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    logger.error('记录用户登出失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户登录历史
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const [rows] = await pool.query(
      'SELECT * FROM user_login_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100',
      [userId]
    );

    res.json(rows);
  } catch (error) {
    logger.error('获取用户登录历史失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
