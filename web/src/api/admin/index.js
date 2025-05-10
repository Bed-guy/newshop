import * as orders from './orders';
import * as users from './users';
import * as classification from './classification';
import dashboardDefault from './dashboard';

// 导入分类API函数
import { listApi, createApi, updateApi, deleteApi } from './classification';

// 创建categories对象，兼容旧的API调用方式
const categories = {
  getCategories: listApi,
  createCategory: createApi,
  updateCategory: updateApi,
  deleteCategory: deleteApi
};

// 创建dashboard对象，兼容旧的API调用方式
const dashboard = dashboardDefault;

export {
  orders,
  categories,
  users,
  dashboard,
  classification
};
