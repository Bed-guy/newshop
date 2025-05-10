import request from '@/utils/request';

/**
 * 获取管理员仪表盘数据
 * @returns {Promise} 仪表盘数据
 */
function getDashboardData() {
  return request({
    url: '/myapp/admin/overview/count',
    method: 'get'
  });
}

// 导出一个包含 getDashboardData 方法的对象
export default {
  getDashboardData
};
