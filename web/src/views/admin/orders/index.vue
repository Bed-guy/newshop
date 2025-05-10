<template>
  <div class="admin-orders">
    <a-card title="订单管理" :bordered="false">
      <!-- 搜索表单 -->
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="订单状态">
                <a-select v-model="queryParam.status" placeholder="请选择" allowClear>
                  <a-select-option value="pending">待支付</a-select-option>
                  <a-select-option value="paid">已支付</a-select-option>
                  <a-select-option value="shipped">已发货</a-select-option>
                  <a-select-option value="delivered">已送达</a-select-option>
                  <a-select-option value="cancelled">已取消</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="用户ID">
                <a-input v-model="queryParam.user_id" placeholder="请输入" allowClear />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <!-- 表格 -->
      <s-table
        ref="table"
        size="default"
        rowKey="id"
        :columns="columns"
        :data="loadData"
        :alert="false"
        showPagination="auto"
      >
        <span slot="status" slot-scope="text">
          <a-tag :color="statusColor(text)">{{ statusText(text) }}</a-tag>
        </span>
        <span slot="total_amount" slot-scope="text">
          ¥{{ parseFloat(text).toFixed(2) }}
        </span>
        <span slot="created_at" slot-scope="text">
          {{ text ? new Date(text).toLocaleString() : '' }}
        </span>
        <span slot="action" slot-scope="text, record">
          <a @click="handleDetail(record)">详情</a>
          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">
              更多 <a-icon type="down" />
            </a>
            <a-menu slot="overlay">
              <a-menu-item v-if="record.status === 'pending'">
                <a @click="handleUpdateStatus(record, 'paid')">标记为已支付</a>
              </a-menu-item>
              <a-menu-item v-if="record.status === 'paid'">
                <a @click="handleUpdateStatus(record, 'shipped')">标记为已发货</a>
              </a-menu-item>
              <a-menu-item v-if="record.status === 'shipped'">
                <a @click="handleUpdateStatus(record, 'delivered')">标记为已送达</a>
              </a-menu-item>
              <a-menu-item v-if="record.status !== 'cancelled' && record.status !== 'delivered'">
                <a @click="handleUpdateStatus(record, 'cancelled')">取消订单</a>
              </a-menu-item>
              <a-menu-item>
                <a @click="handleDelete(record)">删除</a>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>
      </s-table>
    </a-card>

    <!-- 订单详情抽屉 -->
    <a-drawer
      title="订单详情"
      :width="720"
      :visible="detailVisible"
      :body-style="{ paddingBottom: '80px' }"
      @close="detailVisible = false"
    >
      <a-spin :spinning="detailLoading">
        <a-descriptions :column="2" bordered v-if="detailData">
          <a-descriptions-item label="订单ID">{{ detailData.id }}</a-descriptions-item>
          <a-descriptions-item label="订单状态">
            <a-tag :color="statusColor(detailData.status)">{{ statusText(detailData.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="用户ID">{{ detailData.user_id }}</a-descriptions-item>
          <a-descriptions-item label="用户名">{{ detailData.user ? detailData.user.username : '-' }}</a-descriptions-item>
          <a-descriptions-item label="收件人">{{ detailData.recipient_name }}</a-descriptions-item>
          <a-descriptions-item label="联系电话">{{ detailData.recipient_phone }}</a-descriptions-item>
          <a-descriptions-item label="收货地址" :span="2">{{ detailData.shipping_address }}</a-descriptions-item>
          <a-descriptions-item label="订单金额">¥{{ parseFloat(detailData.total_amount).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="支付方式">{{ paymentMethodText(detailData.payment_method) }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detailData.created_at ? new Date(detailData.created_at).toLocaleString() : '-' }}</a-descriptions-item>
          <a-descriptions-item label="支付时间">{{ detailData.payment_time ? new Date(detailData.payment_time).toLocaleString() : '-' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <h3>订单商品</h3>
        <a-table
          :columns="itemColumns"
          :data-source="detailData ? detailData.items : []"
          rowKey="id"
          :pagination="false"
        >
          <span slot="image" slot-scope="text">
            <img :src="text || 'https://via.placeholder.com/50'" alt="商品图片" style="width: 50px; height: 50px; object-fit: cover;" />
          </span>
          <span slot="price" slot-scope="text">
            ¥{{ parseFloat(text).toFixed(2) }}
          </span>
          <span slot="total" slot-scope="text, record">
            ¥{{ (parseFloat(record.price) * record.quantity).toFixed(2) }}
          </span>
        </a-table>

        <div class="drawer-footer">
          <a-button :style="{ marginRight: '8px' }" @click="detailVisible = false">关闭</a-button>
          <a-button v-if="detailData && detailData.status === 'pending'" type="primary" @click="handleUpdateStatus(detailData, 'paid')">
            标记为已支付
          </a-button>
          <a-button v-if="detailData && detailData.status === 'paid'" type="primary" @click="handleUpdateStatus(detailData, 'shipped')">
            标记为已发货
          </a-button>
          <a-button v-if="detailData && detailData.status === 'shipped'" type="primary" @click="handleUpdateStatus(detailData, 'delivered')">
            标记为已送达
          </a-button>
        </div>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script>
import { STable } from '@/components';
import { orders } from '@/api/admin';

export default {
  name: 'AdminOrders',
  components: {
    STable
  },
  data() {
    return {
      // 查询参数
      queryParam: {
        status: undefined,
        user_id: undefined
      },
      // 表格列定义
      columns: [
        {
          title: '订单ID',
          dataIndex: 'id'
        },
        {
          title: '用户ID',
          dataIndex: 'user_id'
        },
        {
          title: '用户名',
          dataIndex: 'user.username',
          customRender: (text, record) => record.user ? record.user.username : '-'
        },
        {
          title: '订单金额',
          dataIndex: 'total_amount',
          scopedSlots: { customRender: 'total_amount' }
        },
        {
          title: '订单状态',
          dataIndex: 'status',
          scopedSlots: { customRender: 'status' }
        },
        {
          title: '创建时间',
          dataIndex: 'created_at',
          scopedSlots: { customRender: 'created_at' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: '150px',
          scopedSlots: { customRender: 'action' }
        }
      ],
      // 订单商品列定义
      itemColumns: [
        {
          title: '商品图片',
          dataIndex: 'image_url',
          scopedSlots: { customRender: 'image' }
        },
        {
          title: '商品名称',
          dataIndex: 'product_name'
        },
        {
          title: '单价',
          dataIndex: 'price',
          scopedSlots: { customRender: 'price' }
        },
        {
          title: '数量',
          dataIndex: 'quantity'
        },
        {
          title: '小计',
          scopedSlots: { customRender: 'total' }
        }
      ],
      // 详情抽屉
      detailVisible: false,
      detailLoading: false,
      detailData: null
    };
  },
  methods: {
    // 加载表格数据
    loadData(parameter) {
      const requestParameters = Object.assign({}, parameter, this.queryParam);
      return orders.getOrders(requestParameters).then(res => {
        return {
          pageSize: res.limit,
          pageNo: res.page,
          totalCount: res.total,
          totalPage: res.pages,
          data: res.items
        };
      });
    },
    // 重置搜索
    resetSearch() {
      this.queryParam = {
        status: undefined,
        user_id: undefined
      };
      this.$refs.table.refresh(true);
    },
    // 查看详情
    handleDetail(record) {
      this.detailVisible = true;
      this.detailLoading = true;
      orders.getOrderDetail(record.id).then(res => {
        this.detailData = res;
        this.detailLoading = false;
      }).catch(() => {
        this.detailLoading = false;
      });
    },
    // 更新订单状态
    handleUpdateStatus(record, status) {
      this.$confirm({
        title: `确认将订单状态更新为"${this.statusText(status)}"?`,
        content: '此操作不可逆，请谨慎操作',
        onOk: () => {
          orders.updateOrderStatus(record.id, { status }).then(() => {
            this.$message.success('订单状态更新成功');
            this.$refs.table.refresh();
            if (this.detailVisible && this.detailData && this.detailData.id === record.id) {
              this.handleDetail(record);
            }
          });
        }
      });
    },
    // 删除订单
    handleDelete(record) {
      this.$confirm({
        title: '确认删除此订单?',
        content: '此操作不可逆，请谨慎操作',
        onOk: () => {
          orders.deleteOrder(record.id).then(() => {
            this.$message.success('订单删除成功');
            this.$refs.table.refresh();
            if (this.detailVisible && this.detailData && this.detailData.id === record.id) {
              this.detailVisible = false;
            }
          });
        }
      });
    },
    // 订单状态文本
    statusText(status) {
      const statusMap = {
        'pending': '待支付',
        'paid': '已支付',
        'shipped': '已发货',
        'delivered': '已送达',
        'cancelled': '已取消'
      };
      return statusMap[status] || status;
    },
    // 订单状态颜色
    statusColor(status) {
      const colorMap = {
        'pending': 'orange',
        'paid': 'green',
        'shipped': 'blue',
        'delivered': 'purple',
        'cancelled': 'red'
      };
      return colorMap[status] || 'default';
    },
    // 支付方式文本
    paymentMethodText(method) {
      if (!method) return '-';
      const methodMap = {
        'alipay': '支付宝',
        'wechat': '微信支付',
        'credit_card': '信用卡',
        'cash': '货到付款'
      };
      return methodMap[method] || method;
    }
  }
};
</script>

<style lang="less" scoped>
.admin-orders {
  .table-page-search-wrapper {
    margin-bottom: 16px;
  }
  
  .drawer-footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    border-top: 1px solid #e8e8e8;
    padding: 10px 16px;
    text-align: right;
    left: 0;
    background: #fff;
  }
}
</style>
