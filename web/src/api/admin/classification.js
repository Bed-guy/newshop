import request from '@/utils/request'

// 获取分类列表
export function listApi() {
  return request({
    url: '/myapp/admin/classification',
    method: 'get'
  })
}

// 创建分类
export function createApi(data) {
  console.log("发送创建分类请求:", data);
  return request({
    url: '/myapp/admin/classification',
    method: 'post',
    data
  })
}

// 更新分类
export function updateApi(id, data) {
  console.log("发送更新分类请求:", id, data);
  return request({
    url: `/myapp/admin/classification/${id}`,
    method: 'put',
    data
  })
}

// 删除分类
export function deleteApi(params) {
  // 处理ids参数
  let ids = typeof params.ids === 'string' ? params.ids : String(params.ids);

  // 如果有多个ID，使用批量删除
  if (ids.includes(',')) {
    // 目前不支持批量删除，所以我们逐个删除
    const idArray = ids.split(',');
    const promises = idArray.map(id => {
      return request({
        url: `/myapp/admin/classification/${id}`,
        method: 'delete'
      });
    });
    return Promise.all(promises);
  }

  // 单个ID使用标准删除
  return request({
    url: `/myapp/admin/classification/${ids}`,
    method: 'delete'
  });
}