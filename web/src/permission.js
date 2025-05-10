import router from './router'

// 路由权限白名单
const allowList = ['admin-login', 'login', 'register', 'portal', 'search', 'detail', '403', '404']
// 前台登录地址
const loginRoutePath = '/index/login'
// 后台登录地址
const adminLoginRoutePath = '/admin-login'

// 从localStorage获取token的辅助函数
const getLocalStorage = (key) => {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    console.error('访问localStorage失败:', e)
    return null
  }
}

router.beforeEach((to, from, next) => {
  console.log(to, from)
  /* has token */

  /** 后台路由 **/
  if (to.path.startsWith('/admin')) {
    if (getLocalStorage('token')) {
      if (to.path === adminLoginRoutePath) {
        next({ path: '/' })
      } else {
        // 获取用户信息，检查权限
        const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}")
        const isSuperAdmin = userInfo.is_superuser === "1" || userInfo.is_superuser === 1

        // 检查是否访问仅超级管理员可访问的页面
        if (to.path === '/admin/user' && !isSuperAdmin) {
          // 如果不是超级管理员，重定向到仪表盘
          next({ path: '/admin/overview' })
        } else {
          next()
        }
      }
    } else {
      if (allowList.includes(to.name)) {
        // 在免登录名单，直接进入
        next()
      } else {
        next({ path: adminLoginRoutePath, query: { redirect: to.fullPath } })
      }
    }
  }

  /** 前台路由 **/
  if (to.path.startsWith('/index')) {
    if (getLocalStorage('token')) {
      if (to.path === loginRoutePath) {
        next({ path: '/' })
      } else {
        next()
      }
    } else {
      if (allowList.includes(to.name)) {
        // 在免登录名单，直接进入
        next()
      } else {
        next({ path: loginRoutePath, query: { redirect: to.fullPath } })
      }
    }
  }
})