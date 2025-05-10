<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <!-- 商户选择已被取消 -->
            <!-- <a-col :md="8" :sm="24">
              <a-form-item label="商户名称">
                <a-select
                  v-model="queryParam.merchant_id"
                  placeholder="请选择商户"
                  allowClear
                  style="width: 100%"
                >
                  <a-select-option
                    v-for="merchant in merchants"
                    :key="merchant.id"
                    :value="merchant.id"
                  >
                    {{ merchant.username }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col> -->
            <a-col :md="8" :sm="24">
              <a-form-item label="日期范围">
                <a-range-picker v-model="dateRange" @change="onDateChange" />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="getList">查询</a-button>
                <a-button style="margin-left: 8px" @click="resetSearch"
                  >重置</a-button
                >
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <!-- 销售业绩概览 -->
      <div class="sales-overview">
        <a-row :gutter="24">
          <a-col :span="6">
            <a-card>
              <div class="card-title">总销售额</div>
              <div class="card-value">¥{{ overview.total_sales }}</div>
              <div class="card-footer">
                <span :class="overview.sales_trend > 0 ? 'up' : 'down'">
                  <a-icon
                    :type="overview.sales_trend > 0 ? 'arrow-up' : 'arrow-down'"
                  />
                  {{ Math.abs(overview.sales_trend) }}%
                </span>
                <span>较上期</span>
              </div>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <div class="card-title">订单数</div>
              <div class="card-value">{{ overview.order_count }}</div>
              <div class="card-footer">
                <span :class="overview.order_trend > 0 ? 'up' : 'down'">
                  <a-icon
                    :type="overview.order_trend > 0 ? 'arrow-up' : 'arrow-down'"
                  />
                  {{ Math.abs(overview.order_trend) }}%
                </span>
                <span>较上期</span>
              </div>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <div class="card-title">客单价</div>
              <div class="card-value">¥{{ overview.average_order_value }}</div>
              <div class="card-footer">
                <span :class="overview.aov_trend > 0 ? 'up' : 'down'">
                  <a-icon
                    :type="overview.aov_trend > 0 ? 'arrow-up' : 'arrow-down'"
                  />
                  {{ Math.abs(overview.aov_trend) }}%
                </span>
                <span>较上期</span>
              </div>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <div class="card-title">商品数</div>
              <div class="card-value">{{ overview.product_count }}</div>
              <div class="card-footer">
                <span :class="overview.product_trend > 0 ? 'up' : 'down'">
                  <a-icon
                    :type="
                      overview.product_trend > 0 ? 'arrow-up' : 'arrow-down'
                    "
                  />
                  {{ Math.abs(overview.product_trend) }}%
                </span>
                <span>较上期</span>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 销售趋势图 -->
      <a-card title="销售趋势" style="margin-top: 24px">
        <div ref="salesChart" style="height: 400px"></div>
      </a-card>

      <!-- 商户销售业绩表格 -->
      <a-card title="商户销售业绩" style="margin-top: 24px">
        <a-table
          :columns="columns"
          :rowKey="record => record.id"
          :dataSource="list"
          :pagination="pagination"
          :loading="loading"
          @change="handleTableChange"
        >
          <template slot="salesAmount" slot-scope="text">
            ¥{{ text ? text.toFixed(2) : "0.00" }}
          </template>
          <template slot="orderCount" slot-scope="text">
            {{ text || 0 }}
          </template>
          <template slot="averageOrderValue" slot-scope="text">
            ¥{{ text ? text.toFixed(2) : "0.00" }}
          </template>
          <template slot="action" slot-scope="text, record">
            <a @click="handleDetail(record)">查看详情</a>
          </template>
        </a-table>
      </a-card>

      <!-- 商户详情模态框 -->
      <a-modal
        title="商户销售详情"
        :visible="detailVisible"
        :footer="null"
        @cancel="detailVisible = false"
        width="800px"
      >
        <a-tabs defaultActiveKey="1">
          <a-tab-pane key="1" tab="销售概览">
            <a-descriptions bordered :column="2">
              <a-descriptions-item label="商户ID">{{
                currentMerchant.id
              }}</a-descriptions-item>
              <a-descriptions-item label="商户名称">{{
                currentMerchant.username
              }}</a-descriptions-item>
              <a-descriptions-item label="总销售额"
                >¥{{
                  currentMerchant.sales_amount
                    ? currentMerchant.sales_amount.toFixed(2)
                    : "0.00"
                }}</a-descriptions-item
              >
              <a-descriptions-item label="订单数">{{
                currentMerchant.order_count || 0
              }}</a-descriptions-item>
              <a-descriptions-item label="客单价"
                >¥{{
                  currentMerchant.average_order_value
                    ? currentMerchant.average_order_value.toFixed(2)
                    : "0.00"
                }}</a-descriptions-item
              >
              <a-descriptions-item label="商品数">{{
                currentMerchant.product_count || 0
              }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
          <a-tab-pane key="2" tab="热销商品">
            <a-table
              :columns="productColumns"
              :dataSource="merchantProducts"
              :pagination="{ pageSize: 5 }"
              rowKey="id"
            >
              <template slot="salesAmount" slot-scope="text">
                ¥{{ text ? text.toFixed(2) : "0.00" }}
              </template>
            </a-table>
          </a-tab-pane>
          <a-tab-pane key="3" tab="销售趋势">
            <div ref="merchantChart" style="height: 300px"></div>
          </a-tab-pane>
        </a-tabs>
      </a-modal>
    </a-card>
  </div>
</template>

<script>
import salesPerformanceApi from "@/api/admin/sales-performance";
import * as echarts from "echarts";

export default {
  name: "SalesPerformance",
  data() {
    return {
      // 查询参数
      queryParam: {},
      dateRange: [],
      // 商户列表
      merchants: [],
      // 销售概览数据
      overview: {
        total_sales: 0,
        sales_trend: 0,
        order_count: 0,
        order_trend: 0,
        average_order_value: 0,
        aov_trend: 0,
        product_count: 0,
        product_trend: 0
      },
      // 表格列定义
      columns: [
        {
          title: "商户ID",
          dataIndex: "id"
        },
        {
          title: "商户名称",
          dataIndex: "username"
        },
        {
          title: "销售额",
          dataIndex: "sales_amount",
          scopedSlots: { customRender: "salesAmount" },
          sorter: true
        },
        {
          title: "订单数",
          dataIndex: "order_count",
          scopedSlots: { customRender: "orderCount" },
          sorter: true
        },
        {
          title: "客单价",
          dataIndex: "average_order_value",
          scopedSlots: { customRender: "averageOrderValue" },
          sorter: true
        },
        {
          title: "商品数",
          dataIndex: "product_count",
          sorter: true
        },
        {
          title: "操作",
          dataIndex: "action",
          scopedSlots: { customRender: "action" }
        }
      ],
      // 商品列定义
      productColumns: [
        {
          title: "商品ID",
          dataIndex: "id"
        },
        {
          title: "商品名称",
          dataIndex: "name"
        },
        {
          title: "销售额",
          dataIndex: "sales_amount",
          scopedSlots: { customRender: "salesAmount" }
        },
        {
          title: "销售数量",
          dataIndex: "sales_count"
        },
        {
          title: "库存",
          dataIndex: "stock"
        }
      ],
      // 表格数据
      list: [
        {
          id: 1,
          username: "商户1",
          sales_amount: 5000,
          order_count: 50,
          average_order_value: 100,
          product_count: 20
        },
        {
          id: 2,
          username: "商户2",
          sales_amount: 3000,
          order_count: 40,
          average_order_value: 75,
          product_count: 15
        },
        {
          id: 3,
          username: "商户3",
          sales_amount: 4000,
          order_count: 30,
          average_order_value: 133.33,
          product_count: 10
        }
      ],
      // 分页配置
      pagination: {
        current: 1,
        pageSize: 10,
        total: 3,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条`
      },
      // 加载状态
      loading: false,
      // 详情模态框
      detailVisible: false,
      currentMerchant: {},
      merchantProducts: []
    };
  },
  mounted() {
    this.fetchMerchants();
    this.getOverview();
    this.getList();
  },
  methods: {
    // 获取所有商户列表
    async fetchMerchants() {
      try {
        const response = await salesPerformanceApi.getAllMerchants();
        this.merchants = response.results || [];
      } catch (error) {
        console.error("获取商户列表失败:", error);
        this.$message.error("获取商户列表失败");
      }
    },

    // 获取销售业绩概览
    async getOverview() {
      try {
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id
        };
        const response = await salesPerformanceApi.getOverview(params);
        this.overview = response;
        this.initSalesChart();
      } catch (error) {
        console.error("获取销售业绩概览失败:", error);
        this.$message.error("获取销售业绩概览失败");
      }
    },

    // 获取销售业绩列表
    async getList() {
      this.loading = true;
      try {
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id,
          page: this.pagination.current,
          limit: this.pagination.pageSize,
          sort_field: this.queryParam.sort_field,
          sort_order: this.queryParam.sort_order
        };
        const response = await salesPerformanceApi.getMerchants(params);
        this.list = response.items || [];
        this.pagination.total = response.total || 0;
      } catch (error) {
        console.error("获取销售业绩列表失败:", error);
        this.$message.error("获取销售业绩列表失败");
      } finally {
        this.loading = false;
      }
    },

    // 初始化销售趋势图
    async initSalesChart() {
      try {
        // 获取销售趋势数据
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id
        };
        const trendsData = await salesPerformanceApi.getTrends(params);

        // 初始化图表
        const chartDom = this.$refs.salesChart;
        if (!chartDom) {
          console.warn("销售趋势图DOM元素不存在");
          return;
        }

        const myChart = echarts.init(chartDom);

        // 如果没有数据，显示无数据提示
        if (!trendsData || trendsData.length === 0) {
          myChart.showLoading({
            text: "暂无数据",
            maskColor: "rgba(255, 255, 255, 0.8)",
            fontSize: 16
          });
          return;
        }

        // 准备数据
        const dates = trendsData.map(item => item.date);
        const salesData = trendsData.map(item => item.sales_amount || 0);
        const orderData = trendsData.map(item => item.order_count || 0);

        // 配置图表选项
        const option = {
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow"
            }
          },
          legend: {
            data: ["销售额", "订单数"]
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true
          },
          xAxis: {
            type: "category",
            data: dates
          },
          yAxis: [
            {
              type: "value",
              name: "销售额",
              axisLabel: {
                formatter: "{value} 元"
              }
            },
            {
              type: "value",
              name: "订单数",
              axisLabel: {
                formatter: "{value}"
              }
            }
          ],
          series: [
            {
              name: "销售额",
              type: "line",
              data: salesData
            },
            {
              name: "订单数",
              type: "bar",
              yAxisIndex: 1,
              data: orderData
            }
          ]
        };

        // 渲染图表
        myChart.hideLoading();
        myChart.setOption(option);

        // 监听窗口大小变化，调整图表大小
        window.addEventListener("resize", () => {
          myChart.resize();
        });
      } catch (error) {
        console.error("初始化销售趋势图失败:", error);
        this.$message.error("获取销售趋势数据失败，请稍后重试");
      }
    },

    // 日期范围变化
    onDateChange(dates, dateStrings) {
      if (dates.length > 0) {
        this.queryParam.start_date = dateStrings[0];
        this.queryParam.end_date = dateStrings[1];
      } else {
        this.queryParam.start_date = null;
        this.queryParam.end_date = null;
      }
    },

    // 重置搜索条件
    resetSearch() {
      this.queryParam = {};
      this.dateRange = [];
      this.getOverview();
      this.getList();
    },

    // 表格变化事件
    handleTableChange(pagination, _filters, sorter) {
      this.pagination.current = pagination.current;
      this.pagination.pageSize = pagination.pageSize;
      if (sorter.field) {
        this.queryParam.sort_field = sorter.field;
        this.queryParam.sort_order = sorter.order;
      } else {
        this.queryParam.sort_field = null;
        this.queryParam.sort_order = null;
      }
      this.getList();
    },

    // 查看商户详情
    async handleDetail(record) {
      this.currentMerchant = { ...record };
      this.detailVisible = true;

      try {
        // 获取商户详情数据
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date
        };
        const response = await salesPerformanceApi.getMerchantDetail(
          record.id,
          params
        );

        // 更新商户详情数据
        this.currentMerchant = {
          ...this.currentMerchant,
          ...response
        };

        // 更新商户热销商品
        this.merchantProducts = response.products || [];

        // 在下一个tick初始化商户销售趋势图
        this.$nextTick(() => {
          this.initMerchantChart(response.trends);
        });
      } catch (error) {
        console.error("获取商户详情失败:", error);
        this.$message.error("获取商户详情失败");
      }
    },

    // 初始化商户销售趋势图
    initMerchantChart(trendsData) {
      try {
        // 初始化图表
        const chartDom = this.$refs.merchantChart;
        if (!chartDom) {
          console.warn("商户销售趋势图DOM元素不存在");
          return;
        }

        const myChart = echarts.init(chartDom);

        // 如果没有数据，显示无数据提示
        if (!trendsData || trendsData.length === 0) {
          myChart.showLoading({
            text: "暂无数据",
            maskColor: "rgba(255, 255, 255, 0.8)",
            fontSize: 16
          });
          return;
        }

        // 准备数据
        const dates = trendsData.map(item => item.date);
        const salesData = trendsData.map(item => item.sales_amount || 0);
        const orderData = trendsData.map(item => item.order_count || 0);

        // 配置图表选项
        const option = {
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow"
            }
          },
          legend: {
            data: ["销售额", "订单数"]
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true
          },
          xAxis: {
            type: "category",
            data: dates
          },
          yAxis: [
            {
              type: "value",
              name: "销售额",
              axisLabel: {
                formatter: "{value} 元"
              }
            },
            {
              type: "value",
              name: "订单数",
              axisLabel: {
                formatter: "{value}"
              }
            }
          ],
          series: [
            {
              name: "销售额",
              type: "line",
              data: salesData
            },
            {
              name: "订单数",
              type: "bar",
              yAxisIndex: 1,
              data: orderData
            }
          ]
        };

        // 渲染图表
        myChart.hideLoading();
        myChart.setOption(option);
      } catch (error) {
        console.error("初始化商户销售趋势图失败:", error);
        this.$message.error("获取商户销售趋势数据失败");
      }
    }
  }
};
</script>

<style scoped>
.sales-overview {
  margin-top: 24px;
}
.card-title {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}
.card-value {
  color: rgba(0, 0, 0, 0.85);
  font-size: 24px;
  margin: 10px 0;
}
.card-footer {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}
.up {
  color: #f5222d;
  margin-right: 4px;
}
.down {
  color: #52c41a;
  margin-right: 4px;
}
</style>
