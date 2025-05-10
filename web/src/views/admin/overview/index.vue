<template>
  <div class="admin-dashboard">
    <a-row :gutter="24">
      <!-- 统计卡片 -->
      <a-col :xl="6" :lg="12" :md="12" :sm="24" :xs="24">
        <a-card class="stat-card" :loading="loading">
          <a-statistic
            title="用户总数"
            :value="dashboardData.user_count || 0"
            :precision="0"
          >
            <template #prefix>
              <a-icon type="user" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xl="6" :lg="12" :md="12" :sm="24" :xs="24">
        <a-card class="stat-card" :loading="loading">
          <a-statistic
            title="订单总数"
            :value="dashboardData.order_count || 0"
            :precision="0"
          >
            <template #prefix>
              <a-icon type="shopping-cart" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xl="6" :lg="12" :md="12" :sm="24" :xs="24">
        <a-card class="stat-card" :loading="loading">
          <a-statistic
            title="商品总数"
            :value="dashboardData.product_count || 0"
            :precision="0"
          >
            <template #prefix>
              <a-icon type="shopping" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xl="6" :lg="12" :md="12" :sm="24" :xs="24">
        <a-card class="stat-card" :loading="loading">
          <a-statistic
            title="总销售额"
            :value="dashboardData.total_sales || 0"
            :precision="2"
            suffix="元"
          >
            <template #prefix>
              <a-icon type="dollar" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <!-- 今日数据 -->
      <a-col :xl="12" :lg="24" :md="24" :sm="24" :xs="24">
        <a-card title="今日数据" :loading="loading">
          <a-row :gutter="24">
            <a-col :span="12">
              <a-statistic
                title="今日订单数"
                :value="dashboardData.today_orders || 0"
                :precision="0"
              >
                <template #prefix>
                  <a-icon type="shopping-cart" />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="12">
              <a-statistic
                title="今日销售额"
                :value="dashboardData.today_sales || 0"
                :precision="2"
                suffix="元"
              >
                <template #prefix>
                  <a-icon type="dollar" />
                </template>
              </a-statistic>
            </a-col>
          </a-row>
        </a-card>
      </a-col>

      <!-- 订单状态 -->
      <a-col :xl="12" :lg="24" :md="24" :sm="24" :xs="24">
        <a-card title="订单状态" :loading="loading">
          <a-row :gutter="24">
            <a-col :span="24">
              <a-progress
                v-for="item in orderStatusData"
                :key="item.status"
                :percent="item.percent"
                :status="statusType(item.status)"
                :format="() => `${item.status_text}: ${item.count}`"
                style="margin-bottom: 8px"
              />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <!-- 最近7天订单趋势 -->
      <a-col :span="24">
        <a-card title="最近7天订单趋势" :loading="loading">
          <div ref="chartContainer" style="height: 400px"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <!-- 最近订单 -->
      <a-col :xl="12" :lg="24" :md="24" :sm="24" :xs="24">
        <a-card title="最近订单" :loading="loading">
          <a-list
            itemLayout="horizontal"
            :dataSource="dashboardData.recent_orders || []"
          >
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <template #title>
                  <a @click="viewOrder(item)">订单 #{{ item.id }}</a>
                </template>
                <template #description>
                  <div>
                    <span>用户: {{ item.username }}</span>
                    <a-divider type="vertical" />
                    <span
                      >金额: ¥{{
                        parseFloat(item.total_amount).toFixed(2)
                      }}</span
                    >
                    <a-divider type="vertical" />
                    <a-tag :color="statusColor(item.status)">{{
                      statusText(item.status)
                    }}</a-tag>
                  </div>
                  <div>
                    <span>{{
                      new Date(item.created_at).toLocaleString()
                    }}</span>
                  </div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>

      <!-- 最近用户 -->
      <a-col :xl="12" :lg="24" :md="24" :sm="24" :xs="24">
        <a-card title="最近注册用户" :loading="loading">
          <a-list
            itemLayout="horizontal"
            :dataSource="dashboardData.recent_users || []"
          >
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <template #title>
                  <a @click="viewUser(item)">{{ item.username }}</a>
                </template>
                <template #description>
                  <div>
                    <span>{{ item.email }}</span>
                    <a-divider type="vertical" />
                    <span
                      >注册时间:
                      {{ new Date(item.date_joined).toLocaleString() }}</span
                    >
                  </div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import * as echarts from "echarts";
import dashboardApi from "@/api/admin/dashboard";

export default {
  name: "AdminDashboard",
  data() {
    return {
      loading: true,
      dashboardData: {},
      chart: null
    };
  },
  computed: {
    orderStatusData() {
      if (!this.dashboardData.order_status || !this.dashboardData.order_count) {
        return [];
      }

      return this.dashboardData.order_status.map(item => {
        const statusMap = {
          pending: "待支付",
          paid: "已支付",
          shipped: "已发货",
          delivered: "已送达",
          cancelled: "已取消"
        };

        return {
          status: item.status,
          status_text: statusMap[item.status] || item.status,
          count: item.count,
          percent: Math.round(
            (item.count / this.dashboardData.order_count) * 100
          )
        };
      });
    }
  },
  mounted() {
    this.fetchDashboardData();
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }

    window.removeEventListener("resize", this.resizeChart);
  },
  methods: {
    fetchDashboardData() {
      this.loading = true;
      dashboardApi
        .getDashboardData()
        .then(res => {
          this.dashboardData = res;
          this.loading = false;

          this.$nextTick(() => {
            this.initChart();
          });
        })
        .catch(() => {
          this.loading = false;
        });
    },
    initChart() {
      if (
        !this.dashboardData.last_7_days_orders ||
        this.dashboardData.last_7_days_orders.length === 0
      ) {
        return;
      }

      const chartDom = this.$refs.chartContainer;
      this.chart = echarts.init(chartDom);

      const dates = this.dashboardData.last_7_days_orders.map(
        item => item.date
      );
      const orderCounts = this.dashboardData.last_7_days_orders.map(
        item => item.order_count
      );
      const salesAmounts = this.dashboardData.last_7_days_orders.map(
        item => item.sales_amount
      );

      const option = {
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow"
          }
        },
        legend: {
          data: ["订单数", "销售额"]
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          containLabel: true
        },
        xAxis: [
          {
            type: "category",
            data: dates
          }
        ],
        yAxis: [
          {
            type: "value",
            name: "订单数",
            position: "left"
          },
          {
            type: "value",
            name: "销售额",
            position: "right",
            axisLabel: {
              formatter: "{value} 元"
            }
          }
        ],
        series: [
          {
            name: "订单数",
            type: "bar",
            data: orderCounts
          },
          {
            name: "销售额",
            type: "line",
            yAxisIndex: 1,
            data: salesAmounts
          }
        ]
      };

      this.chart.setOption(option);

      window.addEventListener("resize", this.resizeChart);
    },
    resizeChart() {
      if (this.chart) {
        this.chart.resize();
      }
    },
    statusText(status) {
      const statusMap = {
        pending: "待支付",
        paid: "已支付",
        shipped: "已发货",
        delivered: "已送达",
        cancelled: "已取消"
      };
      return statusMap[status] || status;
    },
    statusColor(status) {
      const colorMap = {
        pending: "orange",
        paid: "green",
        shipped: "blue",
        delivered: "purple",
        cancelled: "red"
      };
      return colorMap[status] || "default";
    },
    statusType(status) {
      const typeMap = {
        pending: "active",
        paid: "success",
        shipped: "normal",
        delivered: "success",
        cancelled: "exception"
      };
      return typeMap[status] || "normal";
    },
    viewOrder(order) {
      this.$router.push(`/admin/order/detail/${order.id}`);
    },
    viewUser(user) {
      this.$router.push(`/admin/user/detail/${user.id}`);
    }
  }
};
</script>

<style lang="less" scoped>
.admin-dashboard {
  .stat-card {
    margin-bottom: 24px;
  }
}
</style>
