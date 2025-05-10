<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="报表类型">
                <a-select
                  v-model="queryParam.report_type"
                  placeholder="请选择报表类型"
                  style="width: 100%"
                >
                  <a-select-option value="daily">日报表</a-select-option>
                  <a-select-option value="weekly">周报表</a-select-option>
                  <a-select-option value="monthly">月报表</a-select-option>
                  <a-select-option value="yearly">年报表</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="日期范围">
                <a-range-picker v-model="dateRange" @change="onDateChange" />
              </a-form-item>
            </a-col>
            <!-- 商户选择已被取消 -->
            <!-- <a-col :md="8" :sm="24">
              <a-form-item label="商户">
                <a-select
                  v-model="queryParam.merchant_id"
                  placeholder="请选择商户"
                  allowClear
                  style="width: 100%"
                >
                  <a-select-option value="all">所有商户</a-select-option>
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
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="getReport">查询</a-button>
                <a-button style="margin-left: 8px" @click="resetSearch"
                  >重置</a-button
                >
                <a-button
                  type="primary"
                  icon="download"
                  style="margin-left: 8px"
                  @click="exportReport"
                  >导出报表</a-button
                >
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <!-- 报表概览 -->
      <a-card title="报表概览" style="margin-top: 24px">
        <a-row :gutter="24">
          <a-col :span="8">
            <a-statistic
              title="总销售额"
              :value="overview.total_sales"
              :precision="2"
              prefix="¥"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic title="订单总数" :value="overview.order_count" />
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="平均客单价"
              :value="overview.average_order_value"
              :precision="2"
              prefix="¥"
            />
          </a-col>
        </a-row>
      </a-card>

      <!-- 销售趋势图 -->
      <a-card title="销售趋势" style="margin-top: 24px">
        <div ref="salesChart" style="height: 400px"></div>
      </a-card>

      <!-- 商品销售排行 -->
      <a-card title="商品销售排行" style="margin-top: 24px">
        <a-table
          :columns="productColumns"
          :dataSource="productRanking"
          :pagination="{ pageSize: 10 }"
          rowKey="id"
        >
          <template slot="salesAmount" slot-scope="text">
            ¥{{ typeof text === "number" ? text.toFixed(2) : "0.00" }}
          </template>
          <template slot="salesPercentage" slot-scope="text">
            <a-progress :percent="text || 0" size="small" />
          </template>
        </a-table>
      </a-card>

      <!-- 商户销售排行 -->
      <a-card title="商户销售排行" style="margin-top: 24px">
        <a-table
          :columns="merchantColumns"
          :dataSource="merchantRanking"
          :pagination="{ pageSize: 10 }"
          rowKey="id"
        >
          <template slot="salesAmount" slot-scope="text">
            ¥{{ typeof text === "number" ? text.toFixed(2) : "0.00" }}
          </template>
          <template slot="salesPercentage" slot-scope="text">
            <a-progress :percent="text || 0" size="small" />
          </template>
        </a-table>
      </a-card>

      <!-- 分类销售分布 -->
      <a-card title="分类销售分布" style="margin-top: 24px">
        <div ref="categoryChart" style="height: 400px"></div>
      </a-card>
    </a-card>
  </div>
</template>

<script>
import salesReportApi from "@/api/admin/sales-report";
import * as echarts from "echarts";

export default {
  name: "SalesReport",
  data() {
    return {
      // 查询参数
      queryParam: {
        report_type: "monthly",
        merchant_id: "all"
      },
      dateRange: [],
      // 商户列表
      merchants: [],
      // 报表概览
      overview: {
        total_sales: 0,
        order_count: 0,
        customer_count: 0,
        average_order_value: 0
      },
      // 商品销售排行列
      productColumns: [
        {
          title: "排名",
          dataIndex: "rank"
        },
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
          title: "占比",
          dataIndex: "sales_percentage",
          scopedSlots: { customRender: "salesPercentage" }
        }
      ],
      // 商品销售排行数据
      productRanking: [
        {
          id: 1,
          rank: 1,
          name: "商品A",
          sales_amount: 5000,
          sales_count: 50,
          sales_percentage: 40
        },
        {
          id: 2,
          rank: 2,
          name: "商品B",
          sales_amount: 3000,
          sales_count: 40,
          sales_percentage: 24
        },
        {
          id: 3,
          rank: 3,
          name: "商品C",
          sales_amount: 2000,
          sales_count: 30,
          sales_percentage: 16
        },
        {
          id: 4,
          rank: 4,
          name: "商品D",
          sales_amount: 1500,
          sales_count: 20,
          sales_percentage: 12
        },
        {
          id: 5,
          rank: 5,
          name: "商品E",
          sales_amount: 1000,
          sales_count: 10,
          sales_percentage: 8
        }
      ],
      // 商户销售排行列
      merchantColumns: [
        {
          title: "排名",
          dataIndex: "rank"
        },
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
          scopedSlots: { customRender: "salesAmount" }
        },
        {
          title: "订单数",
          dataIndex: "order_count"
        },
        {
          title: "占比",
          dataIndex: "sales_percentage",
          scopedSlots: { customRender: "salesPercentage" }
        }
      ],
      // 商户销售排行数据
      merchantRanking: [
        {
          id: 1,
          rank: 1,
          username: "商户1",
          sales_amount: 5000,
          order_count: 50,
          sales_percentage: 42
        },
        {
          id: 2,
          rank: 2,
          username: "商户2",
          sales_amount: 3000,
          order_count: 40,
          sales_percentage: 25
        },
        {
          id: 3,
          rank: 3,
          username: "商户3",
          sales_amount: 4000,
          order_count: 30,
          sales_percentage: 33
        }
      ],
      // 加载状态
      loading: false
    };
  },
  mounted() {
    this.fetchMerchants();
    this.getReport();
  },
  methods: {
    // 获取所有商户列表
    async fetchMerchants() {
      try {
        const response = await salesReportApi.getAllMerchants();
        this.merchants = response.results || [];
      } catch (error) {
        console.error("获取商户列表失败:", error);
        this.$message.error("获取商户列表失败");
      }
    },

    // 获取报表数据
    async getReport() {
      this.loading = true;
      try {
        // 获取报表概览
        await this.getOverview();

        // 获取销售趋势
        await this.initSalesChart();

        // 获取商品销售排行
        await this.getProductRanking();

        // 获取商户销售排行
        await this.getMerchantRanking();

        // 获取分类销售分布
        await this.initCategoryChart();
      } catch (error) {
        console.error("获取报表数据失败:", error);
        this.$message.error("获取报表数据失败");
      } finally {
        this.loading = false;
      }
    },

    // 获取报表概览
    async getOverview() {
      try {
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id,
          report_type: this.queryParam.report_type
        };
        const response = await salesReportApi.getOverview(params);
        this.overview = response;
      } catch (error) {
        console.error("获取报表概览失败:", error);
      }
    },

    // 获取商品销售排行
    async getProductRanking() {
      try {
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id,
          limit: 10
        };
        const response = await salesReportApi.getProductRanking(params);
        this.productRanking = response;
      } catch (error) {
        console.error("获取商品销售排行失败:", error);
      }
    },

    // 获取商户销售排行
    async getMerchantRanking() {
      try {
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          limit: 10
        };
        const response = await salesReportApi.getMerchantRanking(params);

        // 检查是否有数据
        if (!response || !response.items || response.items.length === 0) {
          this.merchantRanking = [];
          return;
        }

        // 计算总销售额
        const totalSales = response.items.reduce(
          (sum, item) => sum + (item.sales_amount || 0),
          0
        );

        // 处理数据
        this.merchantRanking = response.items.map((item, index) => ({
          ...item,
          rank: index + 1,
          sales_percentage:
            totalSales > 0 ? ((item.sales_amount || 0) / totalSales) * 100 : 0
        }));
      } catch (error) {
        console.error("获取商户销售排行失败:", error);
        this.$message.error("获取商户销售排行失败");
      }
    },

    // 初始化销售趋势图
    async initSalesChart() {
      try {
        // 获取销售趋势数据
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id,
          report_type: this.queryParam.report_type
        };
        const trendsData = await salesReportApi.getTrends(params);

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

    // 初始化分类销售分布图
    async initCategoryChart() {
      try {
        // 获取分类销售分布数据
        const params = {
          start_date: this.queryParam.start_date,
          end_date: this.queryParam.end_date,
          merchant_id: this.queryParam.merchant_id
        };
        const categoryData = await salesReportApi.getCategoryDistribution(
          params
        );

        // 初始化图表
        const chartDom = this.$refs.categoryChart;
        if (!chartDom) {
          console.warn("分类销售分布图DOM元素不存在");
          return;
        }

        const myChart = echarts.init(chartDom);

        // 如果没有数据，显示无数据提示
        if (!categoryData || categoryData.length === 0) {
          myChart.showLoading({
            text: "暂无数据",
            maskColor: "rgba(255, 255, 255, 0.8)",
            fontSize: 16
          });
          return;
        }

        // 准备数据
        const categories = categoryData.map(item => item.name);
        const salesData = categoryData.map(item => ({
          name: item.name,
          value: item.sales_amount || 0
        }));

        // 配置图表选项
        const option = {
          tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b}: {c} ({d}%)"
          },
          legend: {
            orient: "vertical",
            left: 10,
            data: categories
          },
          series: [
            {
              name: "分类销售额",
              type: "pie",
              radius: ["50%", "70%"],
              avoidLabelOverlap: false,
              label: {
                show: false,
                position: "center"
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: "18",
                  fontWeight: "bold"
                }
              },
              labelLine: {
                show: false
              },
              data: salesData
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
        console.error("初始化分类销售分布图失败:", error);
        this.$message.error("获取分类销售分布数据失败，请稍后重试");
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
      this.queryParam = {
        report_type: "monthly",
        merchant_id: "all"
      };
      this.dateRange = [];
      this.getReport();
    },

    // 导出报表
    exportReport() {
      // 提示用户
      this.$message.info("正在准备导出报表...");

      // 构建导出参数
      const queryParams = {
        start_date: this.queryParam.start_date || "",
        end_date: this.queryParam.end_date || "",
        merchant_id: this.queryParam.merchant_id || "all",
        report_type: this.queryParam.report_type || "monthly"
      };

      // 在实际实现中，可以使用以下代码打开导出URL
      // const params = new URLSearchParams(queryParams);
      // window.open(`/api/admin/sales-report/export?${params.toString()}`);

      console.log("导出报表参数:", queryParams);

      // 由于后端API尚未实现，这里只显示提示信息
      this.$message.info("报表导出功能待实现");
    }
  }
};
</script>

<style scoped>
.ant-statistic {
  text-align: center;
}
</style>
