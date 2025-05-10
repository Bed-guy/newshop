<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="日期范围">
                <a-range-picker v-model="dateRange" @change="onDateChange" />
                <div style="color: #999; font-size: 12px; margin-top: 4px;">
                  注意：显示所有时间段的数据
                </div>
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="分类">
                <a-select
                  v-model="queryParam.category_id"
                  placeholder="请选择分类"
                  allowClear
                  style="width: 100%"
                >
                  <a-select-option value="all">所有分类</a-select-option>
                  <a-select-option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="getReport">查询</a-button>
                <a-button style="margin-left: 8px" @click="resetSearch"
                  >重置</a-button
                >
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <!-- 销售概览 -->
      <a-card title="销售概览" style="margin-top: 24px">
        <a-row :gutter="24">
          <a-col :span="6">
            <a-statistic
              title="总销售额"
              :value="overview.total_sales"
              :precision="2"
              prefix="¥"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic title="订单总数" :value="overview.order_count" />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="平均客单价"
              :value="overview.average_order_value"
              :precision="2"
              prefix="¥"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic title="商品总数" :value="overview.product_count" />
          </a-col>
        </a-row>
      </a-card>

      <!-- 分类销售排行 -->
      <a-card title="分类销售排行" style="margin-top: 24px">
        <a-table
          :columns="categoryColumns"
          :dataSource="categoryRanking"
          :pagination="{ pageSize: 10 }"
          rowKey="id"
        >
          <template slot="salesAmount" slot-scope="text">
            ¥{{ text ? text.toFixed(2) : "0.00" }}
          </template>
          <template slot="salesPercentage" slot-scope="text">
            <a-progress :percent="text || 0" size="small" />
          </template>
        </a-table>
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
            ¥{{ text ? text.toFixed(2) : "0.00" }}
          </template>
          <template slot="salesPercentage" slot-scope="text">
            <a-progress :percent="text || 0" size="small" />
          </template>
        </a-table>
      </a-card>

      <!-- 销售趋势图 -->
      <a-card title="销售趋势" style="margin-top: 24px">
        <div ref="salesChart" style="height: 400px"></div>
      </a-card>
    </a-card>
  </div>
</template>

<script>
import * as echarts from "echarts";
import request from "@/utils/request";

export default {
  name: "MerchantCategoryPerformance",
  data() {
    return {
      // 查询参数
      queryParam: {
        category_id: "all"
      },
      dateRange: [],
      // 分类列表
      categories: [],
      // 销售概览
      overview: {
        total_sales: 0,
        order_count: 0,
        average_order_value: 0,
        product_count: 0
      },
      // 分类销售排行列
      categoryColumns: [
        {
          title: "排名",
          dataIndex: "rank"
        },
        {
          title: "分类ID",
          dataIndex: "id"
        },
        {
          title: "分类名称",
          dataIndex: "name"
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
      // 分类销售排行数据
      categoryRanking: [],
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
          title: "分类",
          dataIndex: "category_name"
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
      productRanking: [],
      // 加载状态
      loading: false
    };
  },
  mounted() {
    this.getCategories();
    this.getReport();
  },
  methods: {
    // 获取分类列表
    getCategories() {
      // 获取当前商户ID
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      const merchantId = userInfo.id;

      // 构建查询参数，只获取当前商户的分类
      const params = { merchant_id: merchantId };

      request
        .get("/api/categories", { params })
        .then(response => {
          console.log("获取到的分类数据:", response);
          // 处理不同格式的响应
          let categoryData = [];

          if (response && response.items) {
            // 如果是分页格式 {items: [...], total: ...}
            categoryData = response.items;
          } else if (Array.isArray(response)) {
            // 如果直接返回数组
            categoryData = response;
          } else if (response && response.results) {
            // 如果是另一种分页格式 {results: [...], count: ...}
            categoryData = response.results;
          }

          this.categories = categoryData;
        })
        .catch(error => {
          console.error("获取分类列表失败:", error);
          this.$message.error(
            `获取分类列表失败: ${error.message || "未知错误"}`
          );
        });
    },

    // 获取报表数据
    getReport() {
      this.loading = true;

      // 获取当前商户信息
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

      console.log("当前商户信息:", userInfo);

      // 构建查询参数
      const params = {
        ...this.queryParam
      };

      // 注意：我们已经修改了后端API，移除了日期范围过滤
      // 所以不再需要传递日期参数，将显示所有时间段的数据
      // 但为了保持代码结构，我们保留这些参数的处理，只是不再传递它们

      console.log("注意：日期范围过滤已被移除，将显示所有时间段的数据");

      console.log("获取报表数据，参数:", params);

      // 获取销售概览
      request
        .get("/api/admin/merchant-category-performance/overview", { params })
        .then(response => {
          console.log("获取到的销售概览数据:", response);
          this.overview = response;

          // 获取分类销售排行
          if (
            this.queryParam.category_id &&
            this.queryParam.category_id !== "all"
          ) {
            // 如果选择了特定分类，使用分类ID作为参数
            params.category_id = this.queryParam.category_id;
          }

          return request.get(
            "/api/admin/merchant-category-performance/categories",
            { params }
          );
        })
        .then(response => {
          console.log("获取到的分类销售排行数据:", response);

          // 确保response是数组
          const data = Array.isArray(response) ? response : [];

          // 添加排名
          this.categoryRanking = data.map((item, index) => ({
            ...item,
            rank: index + 1,
            // 确保数值字段有默认值
            sales_amount: item.sales_amount || 0,
            order_count: item.order_count || 0,
            product_count: item.product_count || 0,
            sales_percentage: item.sales_percentage || 0
          }));

          // 获取商品销售排行
          // 确保传递正确的分类ID参数
          if (
            this.queryParam.category_id &&
            this.queryParam.category_id !== "all"
          ) {
            params.category_id = this.queryParam.category_id;
          } else {
            params.category_id = "all";
          }

          return request.get(
            "/api/admin/merchant-category-performance/products",
            { params }
          );
        })
        .then(response => {
          console.log("获取到的商品销售排行数据:", response);

          // 确保response是数组
          const data = Array.isArray(response) ? response : [];

          this.productRanking = data.map((item, index) => ({
            ...item,
            rank: index + 1,
            // 确保数值字段有默认值
            sales_count: item.sales_count || 0,
            sales_amount: item.sales_amount || 0,
            sales_percentage: item.sales_percentage || 0
          }));

          // 获取销售趋势
          return request.get(
            "/api/admin/merchant-category-performance/trends",
            { params }
          );
        })
        .then(response => {
          console.log("获取到的销售趋势数据:", response);
          this.initSalesChart(response);
        })
        .catch(error => {
          console.error("获取报表数据失败:", error);
          this.$message.error(
            `获取报表数据失败: ${error.message || "未知错误"}`
          );
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 初始化销售趋势图
    initSalesChart(trendsData) {
      try {
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
        this.$message.error("获取销售趋势数据失败");
      }
    },

    // 日期范围变化
    onDateChange(dates, dateStrings) {
      // 注意：我们已经修改了后端API，移除了日期范围过滤
      // 所以不再需要处理日期参数，但为了保持用户体验，我们仍然更新UI
      if (dates.length > 0) {
        this.queryParam.start_date = dateStrings[0];
        this.queryParam.end_date = dateStrings[1];
        this.$message.info(
          "注意：日期范围过滤已被移除，将显示所有时间段的数据"
        );
      } else {
        this.queryParam.start_date = null;
        this.queryParam.end_date = null;
      }
    },

    // 重置搜索条件
    resetSearch() {
      this.queryParam = {
        category_id: "all"
      };
      this.dateRange = [];
      this.getReport();
    }
  }
};
</script>
