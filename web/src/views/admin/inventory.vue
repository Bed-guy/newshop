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
              <a-form-item label="分类">
                <a-select
                  v-model="queryParam.category"
                  placeholder="请选择分类"
                  allowClear
                >
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
                >
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

      <!-- 批量更新库存功能已被取消 -->
      <div class="table-operator">
        <!-- <a-button type="primary" icon="sync" @click="handleBatchUpdate"
          >批量更新库存</a-button
        > -->
      </div>

      <a-table
        :columns="columns"
        :rowKey="record => record.id"
        :dataSource="list"
        :pagination="pagination"
        :loading="loading"
        :rowSelection="{
          selectedRowKeys: selectedRowKeys,
          onChange: onSelectChange
        }"
        @change="handleTableChange"
      >
        <template slot="stock" slot-scope="text, record">
          <a-input-number
            :value="text"
            :min="0"
            @change="value => handleStockChange(record, value)"
          />
        </template>
        <template slot="stockStatus" slot-scope="text">
          <a-tag :color="getStockStatusColor(text)">
            {{ getStockStatusText(text) }}
          </a-tag>
        </template>
        <template slot="action" slot-scope="text, record">
          <a @click="handleEdit(record)">编辑</a>
          <!-- 历史记录按钮已被隐藏 -->
          <!-- <a-divider type="vertical" />
          <a @click="handleHistory(record)">历史记录</a> -->
        </template>
      </a-table>

      <!-- 编辑库存模态框 -->
      <a-modal
        :title="modalTitle"
        :visible="visible"
        :confirmLoading="confirmLoading"
        @ok="handleOk"
        @cancel="handleCancel"
      >
        <a-form-model
          :model="form"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 18 }"
        >
          <a-form-model-item label="商品名称">
            <span>{{ form.name }}</span>
          </a-form-model-item>
          <a-form-model-item label="当前库存">
            <a-input-number v-model="form.stock" :min="0" style="width: 100%" />
          </a-form-model-item>
          <a-form-model-item label="库存预警值">
            <a-input-number
              v-model="form.stock_warning"
              :min="0"
              style="width: 100%"
            />
          </a-form-model-item>
          <a-form-model-item label="备注">
            <a-textarea
              v-model="form.remark"
              :rows="4"
              placeholder="请输入备注信息"
            />
          </a-form-model-item>
        </a-form-model>
      </a-modal>

      <!-- 历史记录模态框 -->
      <a-modal
        title="库存历史记录"
        :visible="historyVisible"
        :footer="null"
        @cancel="historyVisible = false"
        width="800px"
      >
        <a-timeline>
          <a-timeline-item
            v-for="(item, index) in historyList"
            :key="index"
            :color="getTimelineColor(item.type)"
          >
            <p>
              <strong>{{ item.timestamp }}</strong>
            </p>
            <p>操作类型: {{ getOperationTypeText(item.type) }}</p>
            <p>
              变更数量:
              {{
                item.quantity_change > 0
                  ? "+" + item.quantity_change
                  : item.quantity_change
              }}
            </p>
            <p>变更前: {{ item.before_quantity }}</p>
            <p>变更后: {{ item.after_quantity }}</p>
            <p>操作人: {{ item.operator }}</p>
            <p>备注: {{ item.remark || "无" }}</p>
          </a-timeline-item>
        </a-timeline>
      </a-modal>
    </a-card>
  </div>
</template>

<script>
import {
  listApi,
  updateApi,
  batchUpdateApi,
  getCategoriesApi,
  getMerchantsApi
} from "@/api/admin/inventory";

export default {
  name: "Inventory",
  data() {
    return {
      // 查询参数
      queryParam: {},
      // 分类列表
      categories: [],
      // 商户列表
      merchants: [],
      // 表格列定义
      columns: [
        {
          title: "ID",
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
          title: "当前库存",
          dataIndex: "stock",
          scopedSlots: { customRender: "stock" }
        },
        {
          title: "价格",
          dataIndex: "price",
          customRender: text => {
            return `¥${parseFloat(text).toFixed(2)}`;
          }
        },
        {
          title: "库存状态",
          dataIndex: "stock_status",
          scopedSlots: { customRender: "stockStatus" }
        },
        {
          title: "商户",
          dataIndex: "merchant_name"
        },
        {
          title: "最后更新时间",
          dataIndex: "updated_at"
        },
        {
          title: "操作",
          dataIndex: "action",
          scopedSlots: { customRender: "action" }
        }
      ],
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
      loading: false,
      // 编辑模态框
      visible: false,
      confirmLoading: false,
      modalTitle: "编辑库存",
      form: {},
      // 历史记录模态框
      historyVisible: false,
      historyList: [],
      // 选中的商品
      selectedRowKeys: [],
      selectedRows: []
    };
  },
  mounted() {
    this.getList();
    this.getCategories();
    this.getMerchants();
  },
  methods: {
    // 获取库存列表
    getList() {
      this.loading = true;

      // 构建查询参数
      const params = {
        page: this.pagination.current,
        page_size: this.pagination.pageSize,
        ...this.queryParam
      };

      listApi(params)
        .then(response => {
          this.list = response.results;
          this.pagination.total = response.total;

          // 如果返回了分类列表，更新本地分类列表
          if (response.categories && response.categories.length > 0) {
            this.categories = response.categories;
          }
        })
        .catch(error => {
          this.$message.error(`获取库存列表失败: ${error.message}`);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 获取分类列表
    getCategories() {
      getCategoriesApi()
        .then(response => {
          if (response.results) {
            this.categories = response.results;
          }
        })
        .catch(error => {
          this.$message.error(`获取分类列表失败: ${error.message}`);
        });
    },

    // 获取商户列表
    getMerchants() {
      getMerchantsApi()
        .then(response => {
          if (response.results) {
            this.merchants = response.results;
          }
        })
        .catch(error => {
          this.$message.error(`获取商户列表失败: ${error.message}`);
        });
    },

    // 重置搜索条件
    resetSearch() {
      this.queryParam = {};
      this.pagination.current = 1;
      this.getList();
    },

    // 表格变化事件
    handleTableChange(pagination, filters, sorter) {
      this.pagination.current = pagination.current;
      this.pagination.pageSize = pagination.pageSize;
      if (sorter.field) {
        this.queryParam.ordering =
          sorter.order === "descend" ? `-${sorter.field}` : sorter.field;
      } else {
        this.queryParam.ordering = null;
      }
      this.getList();
    },

    // 库存状态颜色
    getStockStatusColor(status) {
      const colorMap = {
        out_of_stock: "red",
        low: "orange",
        normal: "green",
        high: "blue"
      };
      return colorMap[status] || "default";
    },

    // 库存状态文本
    getStockStatusText(status) {
      const textMap = {
        out_of_stock: "缺货",
        low: "库存不足",
        normal: "库存正常",
        high: "库存充足"
      };
      return textMap[status] || status;
    },

    // 时间线颜色
    getTimelineColor(type) {
      const colorMap = {
        increase: "green",
        decrease: "red",
        adjustment: "blue"
      };
      return colorMap[type] || "gray";
    },

    // 操作类型文本
    getOperationTypeText(type) {
      const textMap = {
        increase: "入库",
        decrease: "出库",
        adjustment: "调整"
      };
      return textMap[type] || type;
    },

    // 库存变更
    handleStockChange(record, value) {
      this.loading = true;

      updateApi(record.id, { stock: value })
        .then(response => {
          this.$message.success(`商品 ${record.name} 库存已更新为 ${value}`);
          // 更新本地数据
          record.stock = value;
        })
        .catch(error => {
          this.$message.error(`更新库存失败: ${error.message}`);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 编辑库存
    handleEdit(record) {
      this.form = { ...record };
      this.visible = true;
    },

    // 查看历史记录
    handleHistory(record) {
      this.loading = true;

      // 获取库存历史记录
      // 这里应该调用API获取历史记录，但目前没有这个API，所以使用模拟数据
      setTimeout(() => {
        this.historyList = [
          {
            timestamp: "2025-05-01 12:00:00",
            type: "increase",
            quantity_change: 50,
            before_quantity: 150,
            after_quantity: 200,
            operator: "admin",
            remark: "补货"
          },
          {
            timestamp: "2025-04-30 15:30:00",
            type: "decrease",
            quantity_change: -20,
            before_quantity: 170,
            after_quantity: 150,
            operator: "system",
            remark: "订单销售"
          },
          {
            timestamp: "2025-04-29 09:15:00",
            type: "adjustment",
            quantity_change: -10,
            before_quantity: 180,
            after_quantity: 170,
            operator: "admin",
            remark: "库存盘点"
          }
        ];
        this.historyVisible = true;
        this.loading = false;
      }, 500);
    },

    // 批量更新库存
    handleBatchUpdate() {
      if (this.selectedRows.length === 0) {
        this.$message.warning("请先选择要更新的商品");
        return;
      }

      this.$confirm({
        title: "批量更新库存",
        content: "确定要批量更新所选商品的库存吗？",
        okText: "确定",
        cancelText: "取消",
        onOk: () => {
          this.$prompt({
            title: "批量更新库存",
            content: "请输入要增加或减少的库存数量（正数为增加，负数为减少）",
            inputType: "number",
            okText: "确定",
            cancelText: "取消",
            onOk: value => {
              const changeValue = parseInt(value);
              if (isNaN(changeValue)) {
                this.$message.error("请输入有效的数字");
                return;
              }

              this.loading = true;

              // 构建批量更新数据
              const products = this.selectedRows.map(item => {
                const newStock = Math.max(0, item.stock + changeValue);
                return {
                  id: item.id,
                  stock: newStock
                };
              });

              batchUpdateApi({
                products,
                remark: `批量${changeValue > 0 ? "增加" : "减少"}库存`
              })
                .then(response => {
                  this.$message.success(
                    `批量更新成功: ${response.results.length}个商品`
                  );
                  this.getList();
                  this.selectedRowKeys = [];
                  this.selectedRows = [];
                })
                .catch(error => {
                  this.$message.error(`批量更新失败: ${error.message}`);
                })
                .finally(() => {
                  this.loading = false;
                });
            }
          });
        }
      });
    },

    // 提交表单
    handleOk() {
      this.confirmLoading = true;

      const data = {
        stock: this.form.stock,
        price: this.form.price,
        remark: this.form.remark
      };

      updateApi(this.form.id, data)
        .then(response => {
          this.$message.success("库存更新成功");
          this.visible = false;
          this.getList();
        })
        .catch(error => {
          this.$message.error(`更新失败: ${error.message}`);
        })
        .finally(() => {
          this.confirmLoading = false;
        });
    },

    // 取消表单
    handleCancel() {
      this.visible = false;
    },

    // 表格行选择变化
    onSelectChange(selectedRowKeys, selectedRows) {
      this.selectedRowKeys = selectedRowKeys;
      this.selectedRows = selectedRows;
    }
  }
};
</script>
