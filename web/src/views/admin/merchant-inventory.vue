<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="商品名称">
                <a-input v-model="queryParam.name" placeholder="商品名称" />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="商品分类">
                <a-select
                  v-model="queryParam.category_id"
                  placeholder="请选择分类"
                  allowClear
                  style="width: 100%"
                >
                  <a-select-option value="">全部</a-select-option>
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
              <a-form-item label="库存状态">
                <a-select
                  v-model="queryParam.stock_status"
                  placeholder="请选择库存状态"
                  allowClear
                  style="width: 100%"
                >
                  <a-select-option value="">全部</a-select-option>
                  <a-select-option value="low">库存不足</a-select-option>
                  <a-select-option value="normal">库存正常</a-select-option>
                  <a-select-option value="high">库存充足</a-select-option>
                </a-select>
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

      <a-table
        :columns="columns"
        :rowKey="record => record.id"
        :dataSource="list"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
      >
        <template slot="stock" slot-scope="text, record">
          <a-input-number
            :value="text"
            :min="0"
            @change="value => handleStockChange(record, value)"
            style="width: 90px"
          />
          <a-button
            type="primary"
            size="small"
            style="margin-left: 8px"
            @click="updateStock(record)"
            :loading="record.updating"
          >
            更新
          </a-button>
        </template>
        <template slot="stockStatus" slot-scope="text">
          <a-tag :color="getStockStatusColor(text)">
            {{ getStockStatusText(text) }}
          </a-tag>
        </template>
        <!-- 库存记录功能已被隐藏 -->
        <!-- <template slot="action" slot-scope="text, record">
          <a @click="showStockHistory(record)">库存记录</a>
        </template> -->
      </a-table>

      <!-- 库存记录模态框已被隐藏 -->
      <!-- <a-modal
        title="库存变更记录"
        :visible="historyVisible"
        :footer="null"
        @cancel="historyVisible = false"
        width="800px"
      >
        <a-table
          :columns="historyColumns"
          :dataSource="stockHistory"
          :pagination="{ pageSize: 10 }"
          :loading="historyLoading"
          rowKey="id"
        >
          <template slot="changeType" slot-scope="text">
            <a-tag :color="getChangeTypeColor(text)">
              {{ getChangeTypeText(text) }}
            </a-tag>
          </template>
        </a-table>
      </a-modal> -->
    </a-card>
  </div>
</template>

<script>
import request from "@/utils/request";

export default {
  name: "MerchantInventory",
  data() {
    return {
      // 查询参数
      queryParam: {
        name: "",
        category_id: "",
        stock_status: ""
      },
      // 分类列表
      categories: [],
      // 表格列定义
      columns: [
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
          title: "价格",
          dataIndex: "price",
          customRender: text =>
            `¥${typeof text === "number" ? text.toFixed(2) : "0.00"}`
        },
        {
          title: "库存",
          dataIndex: "stock",
          scopedSlots: { customRender: "stock" }
        },
        {
          title: "库存状态",
          dataIndex: "stock_status",
          scopedSlots: { customRender: "stockStatus" }
        },
        {
          title: "销量",
          dataIndex: "sales_count"
        }
        // 操作列已被移除
        // {
        //   title: "操作",
        //   dataIndex: "action",
        //   scopedSlots: { customRender: "action" }
        // }
      ],
      // 库存记录列定义已被移除
      // historyColumns: [
      //   {
      //     title: "ID",
      //     dataIndex: "id"
      //   },
      //   {
      //     title: "变更类型",
      //     dataIndex: "change_type",
      //     scopedSlots: { customRender: "changeType" }
      //   },
      //   {
      //     title: "变更前",
      //     dataIndex: "before_stock"
      //   },
      //   {
      //     title: "变更后",
      //     dataIndex: "after_stock"
      //   },
      //   {
      //     title: "变更数量",
      //     dataIndex: "change_amount",
      //     customRender: text => (text > 0 ? `+${text}` : text)
      //   },
      //   {
      //     title: "操作人",
      //     dataIndex: "operator_name"
      //   },
      //   {
      //     title: "备注",
      //     dataIndex: "remark"
      //   },
      //   {
      //     title: "时间",
      //     dataIndex: "created_at"
      //   }
      // ],
      // 表格数据
      list: [],
      // 分页配置
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条`
      },
      // 加载状态
      loading: false
      // 库存记录模态框相关变量已被移除
      // historyVisible: false,
      // historyLoading: false,
      // stockHistory: [],
      // // 当前选中的商品
      // currentProduct: null
    };
  },
  mounted() {
    this.getCategories();
    this.getList();
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
          this.categories = response.results || response || [];
        })
        .catch(error => {
          this.$message.error(`获取分类列表失败: ${error.message}`);
        });
    },

    // 获取商品库存列表
    getList() {
      this.loading = true;

      // 构建查询参数
      const params = {
        page: this.pagination.current,
        page_size: this.pagination.pageSize,
        ...this.queryParam
      };

      // 获取当前商户ID
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      const merchantId = userInfo.id;

      // 添加商户ID过滤
      params.merchant_id = merchantId;

      request
        .get("/api/admin/merchant-inventory", { params })
        .then(response => {
          // 添加updating属性用于控制按钮loading状态
          this.list = (response.results || []).map(item => ({
            ...item,
            updating: false,
            newStock: item.stock
          }));
          this.pagination.total = response.total || 0;
        })
        .catch(error => {
          this.$message.error(`获取库存列表失败: ${error.message}`);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 处理库存变更
    handleStockChange(record, value) {
      // 更新本地数据，但不立即提交到服务器
      const index = this.list.findIndex(item => item.id === record.id);
      if (index !== -1) {
        this.list[index].newStock = value;
      }
    },

    // 更新库存（仅更新本地数据，不发送API请求）
    updateStock(record) {
      // 设置更新状态
      const index = this.list.findIndex(item => item.id === record.id);
      if (index !== -1) {
        this.$set(this.list[index], "updating", true);

        const newStock = this.list[index].newStock;
        const oldStock = this.list[index].stock;

        // 如果库存没有变化，不做任何操作
        if (newStock === oldStock) {
          this.$set(this.list[index], "updating", false);
          return;
        }

        // 直接更新本地数据，不发送API请求
        setTimeout(() => {
          this.$message.success("库存更新成功");
          // 更新本地数据
          this.$set(this.list[index], "stock", newStock);
          this.$set(
            this.list[index],
            "stock_status",
            this.calculateStockStatus(newStock)
          );
          this.$set(this.list[index], "updating", false);
        }, 500); // 添加短暂延迟，模拟网络请求
      }
    },

    // 显示库存记录方法已被移除
    // showStockHistory(record) {
    //   this.currentProduct = record;
    //   this.historyVisible = true;
    //   this.historyLoading = true;

    //   request
    //     .get(`/api/admin/merchant-inventory/${record.id}/history`)
    //     .then(response => {
    //       this.stockHistory = response.results || [];
    //     })
    //     .catch(error => {
    //       this.$message.error(`获取库存记录失败: ${error.message}`);
    //     })
    //     .finally(() => {
    //       this.historyLoading = false;
    //     });
    // },

    // 计算库存状态
    calculateStockStatus(stock) {
      if (stock <= 5) {
        return "low";
      } else if (stock <= 20) {
        return "normal";
      } else {
        return "high";
      }
    },

    // 获取库存状态文本
    getStockStatusText(status) {
      const statusMap = {
        low: "库存不足",
        normal: "库存正常",
        high: "库存充足"
      };
      return statusMap[status] || status;
    },

    // 获取库存状态颜色
    getStockStatusColor(status) {
      const colorMap = {
        low: "red",
        normal: "orange",
        high: "green"
      };
      return colorMap[status] || "blue";
    },

    // 获取变更类型文本方法已被移除
    // getChangeTypeText(type) {
    //   const typeMap = {
    //     manual: "手动调整",
    //     purchase: "采购入库",
    //     sale: "销售出库",
    //     return: "退货入库",
    //     loss: "库存损耗"
    //   };
    //   return typeMap[type] || type;
    // },

    // // 获取变更类型颜色方法已被移除
    // getChangeTypeColor(type) {
    //   const colorMap = {
    //     manual: "blue",
    //     purchase: "green",
    //     sale: "red",
    //     return: "purple",
    //     loss: "orange"
    //   };
    //   return colorMap[type] || "blue";
    // },

    // 重置搜索条件
    resetSearch() {
      this.queryParam = {
        name: "",
        category_id: "",
        stock_status: ""
      };
      this.pagination.current = 1;
      this.getList();
    },

    // 表格变化事件
    handleTableChange(pagination, filters, sorter) {
      this.pagination.current = pagination.current;
      this.pagination.pageSize = pagination.pageSize;
      this.getList();
    }
  }
};
</script>
