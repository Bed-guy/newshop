import Vue from 'vue'
import Router from 'vue-router'

// 重复点击bug
const originalPush = Router.prototype.push

Router.prototype.push = function push (location) {
  return originalPush.call(this, location).catch(err => err)
}

Vue.use(Router)

const constantRouterMap = [
  // ************* 前台路由 **************
  {
    path: '/',
    redirect: '/index'
  },
  {
    path: '/index',
    name: 'index',
    redirect: '/index/portal',
    component: () => import('@/views/index'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/index/login')
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/views/index/register')
      },
      {
        path: 'portal',
        name: 'portal',
        component: () => import('@/views/index/portal')
      },
      {
        path: 'detail',
        name: 'detail',
        component: () => import('@/views/index/detail')
      },
      {
        path: 'confirm',
        name: 'confirm',
        component: () => import('@/views/index/confirm')
      },
      {
        path: 'pay',
        name: 'pay',
        component: () => import('@/views/index/pay')
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/views/index/search')
      },
      {
        path: 'user',
        name: 'user',
        redirect: 'user/addressView',
        component: () => import('@/views/index/user'),
        children: [

          {
            path: 'wishThingView',
            name: 'wishThingView',
            component: () => import('@/views/index/user/wish-thing-view')
          },

          {
            path: 'orderView',
            name: 'orderView',
            component: () => import('@/views/index/user/order-view')
          },
          {
            path: 'orderView',
            name: 'orderView',
            component: () => import('@/views/index/user/order-view')
          },
          {
            path: 'userInfoEditView',
            name: 'userInfoEditView',
            component: () => import('@/views/index/user/userinfo-edit-view')
          },

          {
            path: 'fansView',
            name: 'fansView',
            component: () => import('@/views/index/user/fans-view')
          },




        ]
      }
    ]
  },
  // ************* 后台路由 **************
  {
    path: '/admin',
    name: 'admin',
    redirect: '/admin/overview',
    component: () => import('@/views/admin/layout/adminLayout'),
    children: [
      {
        path: 'overview',
        name: 'overview',
        component: () => import('@/views/admin/overview/index')
      },
      {
        path: 'thing',
        name: 'thing',
        component: () => import('@/views/admin/thing')
      },
      {
        path: 'classification',
        name: 'classification',
        component: () => import('@/views/admin/classification')
      },




      {
        path: 'banner',
        name: 'banner',
        component: () => import('@/views/admin/banner')
      },



      {
        path: 'order',
        name: 'order',
        component: () => import('@/views/admin/order')
      },
      {
        path: 'user',
        name: 'user',
        component: () => import('@/views/admin/user')
      },
      {
        path: 'merchant',
        name: 'merchant',
        component: () => import('@/views/admin/merchant')
      },
      {
        path: 'sales-log',
        name: 'sales-log',
        component: () => import('@/views/admin/sales-log')
      },
      {
        path: 'merchant-sales-log',
        name: 'merchant-sales-log',
        component: () => import('@/views/admin/merchant-sales-log')
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('@/views/admin/inventory')
      },
      {
        path: 'merchant-inventory',
        name: 'merchant-inventory',
        component: () => import('@/views/admin/merchant-inventory')
      },
      {
        path: 'merchant-category-performance',
        name: 'merchant-category-performance',
        component: () => import('@/views/admin/merchant-category-performance')
      },
      {
        path: 'sales-performance',
        name: 'sales-performance',
        component: () => import('@/views/admin/sales-performance')
      },
      {
        path: 'sales-report',
        name: 'sales-report',
        component: () => import('@/views/admin/sales-report')
      },

    ]
  },
  {
    path: '/admin-login',
    name: 'admin-login',
    component: () => import('@/views/admin-login')
  }
]

export default new Router({
  routes: constantRouterMap
})
