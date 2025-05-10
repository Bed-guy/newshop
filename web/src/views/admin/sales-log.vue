<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="商品名称">
                <a-input
                  v-model="queryParam.product_name"
                  placeholder="商品名称"
                />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="用户名">
                <a-input v-model="queryParam.username" placeholder="用户名" />
              </a-form-item>
            </a-col>
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

      <a-table
        :columns="columns"
        :rowKey="record => record.id"
        :dataSource="list"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
      >
        <span slot="action" slot-scope="text, record">
          <a @click="handleView(record)">查看详情</a>
        </span>
      </a-table>

      <!-- 查看详情模态框 -->
      <a-modal
        title="日志详情"
        :visible="detailVisible"
        :footer="null"
        @cancel="detailVisible = false"
      >
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="ID">{{
            currentRecord.id
          }}</a-descriptions-item>
          <a-descriptions-item label="用户ID">{{
            currentRecord.user_id
          }}</a-descriptions-item>
          <a-descriptions-item label="用户名">{{
            currentRecord.username
          }}</a-descriptions-item>
          <a-descriptions-item label="商品ID">{{
            currentRecord.product_id
          }}</a-descriptions-item>
          <a-descriptions-item label="商品名称">{{
            currentRecord.product_name
          }}</a-descriptions-item>
          <a-descriptions-item label="操作类型">{{
            currentRecord.action_type
          }}</a-descriptions-item>
          <a-descriptions-item label="IP地址">{{
            currentRecord.ip_address
          }}</a-descriptions-item>
          <a-descriptions-item label="时间">{{
            currentRecord.timestamp
          }}</a-descriptions-item>
          <a-descriptions-item label="停留时间"
            >{{ currentRecord.duration }} 秒</a-descriptions-item
          >
          <a-descriptions-item label="用户代理">{{
            currentRecord.user_agent
          }}</a-descriptions-item>
        </a-descriptions>
      </a-modal>
    </a-card>
  </div>
</template>

<script>
import moment from "moment";
import { listApi, detailApi, getMerchants } from "@/api/admin/sales-log";

export default {
  name: "SalesLog",
  data() {
    return {
      // 查询参数
      queryParam: {},
      dateRange: [],
      // 表格列定义
      columns: [
        {
          title: "ID",
          dataIndex: "id"
        },
        {
          title: "用户名",
          dataIndex: "username"
        },
        {
          title: "商品名称",
          dataIndex: "product_name"
        },
        {
          title: "操作类型",
          dataIndex: "action_type",
          customRender: text => {
            const actionMap = {
              view: "浏览",
              add_to_cart: "加入购物车",
              purchase: "购买"
            };
            return actionMap[text] || text;
          }
        },
        {
          title: "IP地址",
          dataIndex: "ip_address"
        },
        {
          title: "时间",
          dataIndex: "purchase_date",
          customRender: (text, record) => {
            return record.purchase_date || record.timestamp || "";
          },
          sorter: true
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
      // 详情模态框
      detailVisible: false,
      currentRecord: {},
      // 商户列表
      merchants: []
    };
  },
  mounted() {
    this.getList();
    this.getMerchants();
  },
  methods: {
    // 获取日志列表
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
        })
        .catch(error => {
          this.$message.error(`获取销售日志失败: ${error.message}`);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 获取商户列表
    getMerchants() {
      getMerchants()
        .then(response => {
          this.merchants = response.results;
        })
        .catch(error => {
          this.$message.error(`获取商户列表失败: ${error.message}`);
        });
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

    // 查看详情
    handleView(record) {
      this.loading = true;

      detailApi(record.id)
        .then(response => {
          this.currentRecord = response;
          this.detailVisible = true;
        })
        .catch(error => {
          this.$message.error(`获取日志详情失败: ${error.message}`);
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }
};
</script>
