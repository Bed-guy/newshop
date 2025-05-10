<template>
  <div
    style="width: 200px; height: 100%; padding-bottom: 48px; overflow: scroll;"
  >
    <a-menu
      :default-selected-keys="[this.$route.path]"
      :default-open-keys="[]"
      @click="handleMenuClick"
      theme="dark"
      mode="inline"
    >
      <!-- 仪表盘 - 只有超级管理员可以看到 -->
      <a-menu-item key="/admin/overview" v-if="isSuperAdmin">
        <a-icon type="dashboard" />
        <span>仪表盘</span>
      </a-menu-item>

      <!-- 商户（销售人员）菜单组 -->
      <a-sub-menu key="merchant-menu">
        <span slot="title">
          <a-icon type="shop" />
          <span>商品管理</span>
        </span>

        <a-menu-item key="/admin/thing">
          <a-icon type="shopping" />
          <span>商品列表</span>
        </a-menu-item>

        <a-menu-item key="/admin/classification" v-if="!isSuperAdmin">
          <a-icon type="appstore" />
          <span>商品分类</span>
        </a-menu-item>

        <a-menu-item key="/admin/inventory" v-if="isSuperAdmin">
          <a-icon type="database" />
          <span>库存管理</span>
        </a-menu-item>
        <a-menu-item key="/admin/merchant-inventory" v-if="!isSuperAdmin">
          <a-icon type="database" />
          <span>库存管理</span>
        </a-menu-item>
      </a-sub-menu>

      <!-- 订单管理 -->
      <a-menu-item key="/admin/order">
        <a-icon type="shopping-cart" />
        <span>订单管理</span>
      </a-menu-item>

      <!-- 商户专属菜单项 -->
      <template v-if="!isSuperAdmin">
        <!-- 销售日志 -->
        <a-menu-item key="/admin/merchant-sales-log">
          <a-icon type="file-text" />
          <span>销售日志</span>
        </a-menu-item>

        <!-- 分类销售业绩 -->
        <a-menu-item key="/admin/merchant-category-performance">
          <a-icon type="bar-chart" />
          <span>分类销售业绩</span>
        </a-menu-item>
      </template>

      <!-- 管理员专属销售日志 -->
      <a-menu-item key="/admin/sales-log" v-if="isSuperAdmin">
        <a-icon type="file-text" />
        <span>销售日志</span>
      </a-menu-item>

      <!-- 超级管理员专属菜单项 -->
      <template v-if="isSuperAdmin">
        <!-- 管理员菜单组 -->
        <a-sub-menu key="admin-menu">
          <span slot="title">
            <a-icon type="user" />
            <span>管理员功能</span>
          </span>

          <!-- 商户管理 -->
          <a-menu-item key="/admin/merchant">
            <a-icon type="team" />
            <span>销售人员管理</span>
          </a-menu-item>
        </a-sub-menu>

        <!-- 数据分析菜单组 -->
        <a-sub-menu key="analytics-menu">
          <span slot="title">
            <a-icon type="area-chart" />
            <span>数据分析</span>
          </span>

          <!-- 销售业绩统计 -->
          <a-menu-item key="/admin/sales-performance">
            <a-icon type="bar-chart" />
            <span>销售业绩统计</span>
          </a-menu-item>

          <!-- 销售报表 -->
          <a-menu-item key="/admin/sales-report">
            <a-icon type="pie-chart" />
            <span>销售报表</span>
          </a-menu-item>
        </a-sub-menu>
      </template>
    </a-menu>
  </div>
</template>

<script>
// 参考：https://1x.antdv.com/components/menu-cn/#API

export default {
  name: "SiderBar",
  data() {
    return {
      isSuperAdmin: false
    };
  },
  created() {
    // 获取当前登录用户信息
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    // 判断是否为超级管理员 - 如果id为11（admin用户）或is_superuser为true，则视为超级管理员
    this.isSuperAdmin =
      userInfo.id == 11 ||
      userInfo.is_superuser === "1" ||
      userInfo.is_superuser === 1;

    console.log("用户信息:", userInfo);
    console.log("是否超级管理员:", this.isSuperAdmin);
  },
  methods: {
    handleMenuClick({ key }) {
      if (key !== this.$route.path) {
        this.$router.push(key);
      }
    }
  }
};
</script>

<style scoped lang="less">
@scroll-bar-size: 6px;

// 定义滚动条高宽及背景 高宽分别对应横竖滚动条的尺寸
::-webkit-scrollbar {
  width: @scroll-bar-size;
  height: @scroll-bar-size;
  background-color: transparent;
}

// 定义滚动条轨道 内阴影+圆角
::-webkit-scrollbar-track {
  border-radius: @scroll-bar-size / 2;
  background-color: transparent;
}

// 定义滑块 内阴影+圆角
::-webkit-scrollbar-thumb {
  border-radius: @scroll-bar-size / 2;
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
