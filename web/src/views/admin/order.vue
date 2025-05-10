<template>
  <div class="page-view">
    <div class="table-wrap" ref="tableWrap">
      <a-table
        size="middle"
        rowKey="id"
        :loading="loading"
        :columns="columns"
        :data-source="data"
        :scroll="{ x: 'max-content' }"
        :row-selection="rowSelection()"
        :pagination="{
          size: 'default',
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: current => {
            page = current;
            getList();
          },
          onShowSizeChange: (current, size) => {
            page = current;
            pageSize = size;
            getList();
          },
          pageSizeOptions: ['10', '20', '30', '40'],
          showSizeChanger: true,
          showTotal: total => `共${total}条数据`
        }"
      >
        <span slot="status" slot-scope="text">
          <a-tag :color="getStatusColor(text)">
            {{ getStatusText(text) }}
          </a-tag>
        </span>
        <span slot="operation" class="operation" slot-scope="text, record">
          <a-space :size="16">
            <a @click="handleView(record)">查看</a>
            <a @click="handleCancel(record)" v-if="record.status === '1'"
              >取消</a
            >
            <a @click="handlePay(record)" v-if="record.status === '1'">支付</a>
            <!-- <a @click="handleShip(record)" v-if="record.status === '2'">发货</a> -->
            <a @click="handleDelete(record)">删除</a>
          </a-space>
        </span>
      </a-table>
    </div>
  </div>
</template>

<script>
import {
  listApi,
  createApi,
  updateApi,
  cancelOrderApi,
  delayApi,
  deleteApi
} from "@/api/admin/order";

const columns = [
  {
    title: "序号",
    dataIndex: "index",
    key: "index",
    align: "center"
  },
  {
    title: "收件人",
    dataIndex: "username",
    key: "username",
    align: "center"
  },
  {
    title: "商品",
    dataIndex: "title",
    key: "title",
    align: "center",
    customRender: text =>
      text && text.length > 10 ? text.substring(0, 10) + "..." : text || "--"
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    align: "center",
    scopedSlots: { customRender: "status" }
  },
  {
    title: "订单金额",
    dataIndex: "total_amount",
    key: "total_amount",
    align: "center"
  },
  {
    title: "订单时间",
    dataIndex: "order_time",
    key: "order_time",
    align: "center"
  },
  {
    title: "操作",
    dataIndex: "action",
    align: "center",
    fixed: "right",
    width: 200,
    scopedSlots: { customRender: "operation" }
  }
];

export default {
  name: "Order",
  data() {
    return {
      loading: false,
      selectedRowKeys: [],
      columns,
      data: [],
      total: 0,
      pageSize: 10,
      page: 1,
      searchKeyword: "",
      statusFilter: null
    };
  },
  methods: {
    // 搜索方法
    onSearch(value) {
      this.searchKeyword = value;
      this.page = 1; // 重置到第一页
      this.getList();
    },

    // 状态过滤方法
    onStatusChange(value) {
      this.statusFilter = value;
      this.page = 1; // 重置到第一页
      this.getList();
    },

    // 查看订单详情
    handleView(record) {
      // 直接使用已经在record中保存的原始数据
      this.showOrderDetail(record.raw);
    },

    // 显示订单详情
    showOrderDetail(orderData) {
      const statusMap = {
        pending: "待付款",
        paid: "已付款",
        shipped: "已发货",
        delivered: "已送达",
        cancelled: "已取消"
      };

      // 构建订单项列表HTML
      let itemsHtml = "";
      if (orderData.items && orderData.items.length > 0) {
        itemsHtml =
          '<div style="margin-top:10px;"><h4>订单商品:</h4><ul style="list-style-type:none;padding-left:0">';
        orderData.items.forEach(item => {
          const totalPrice = item.total_price || item.price * item.quantity;
          itemsHtml += `<li>商品ID: ${item.product} × ${item.quantity} = ¥${
            totalPrice ? totalPrice.toFixed(2) : "0.00"
          }</li>`;
        });
        itemsHtml += "</ul></div>";
      }

      this.$info({
        title: `订单详情 (ID: ${orderData.id})`,
        width: 500,
        content: h => {
          return h("div", {}, [
            h("p", {}, `收件人: ${orderData.recipient_name}`),
            h("p", {}, `手机号: ${orderData.recipient_phone}`),
            h("p", {}, `地址: ${orderData.shipping_address}`),
            h(
              "p",
              {},
              `订单状态: ${statusMap[orderData.status] || orderData.status}`
            ),
            h("p", {}, `创建时间: ${orderData.created_at}`),
            h("p", {}, `订单金额: ¥${orderData.total_amount}`),
            h("div", {
              domProps: { innerHTML: itemsHtml }
            })
          ]);
        },
        onOk() {}
      });
    },

    // 支付订单
    handlePay(record) {
      const that = this;
      this.$confirm({
        title: "确定将此订单标记为已支付?",
        onOk() {
          // 调用支付API，修改订单状态
          updateApi(record.id, {
            status: "paid"
          })
            .then(res => {
              that.$message.success("支付成功");
              that.getList();
            })
            .catch(err => {
              that.$message.error(
                (err.response &&
                  err.response.data &&
                  err.response.data.detail) ||
                  "支付失败"
              );
            });
        }
      });
    },

    // 发货
    handleShip(record) {
      const that = this;
      this.$confirm({
        title: "确定将此订单标记为已发货?",
        onOk() {
          // 调用API修改订单状态为已发货
          updateApi(record.id, {
            status: "shipped"
          })
            .then(res => {
              that.$message.success("发货成功");
              that.getList();
            })
            .catch(err => {
              that.$message.error(
                (err.response &&
                  err.response.data &&
                  err.response.data.detail) ||
                  "发货失败"
              );
            });
        }
      });
    },

    // 获取状态文本
    getStatusText(status) {
      switch (status) {
        case "1":
          return "待付款";
        case "2":
          return "已付款";
        case "3":
          return "已发货";
        case "4":
          return "已送达";
        case "5":
          return "已取消";
        default:
          return "未知状态";
      }
    },

    // 获取状态颜色
    getStatusColor(status) {
      switch (status) {
        case "1":
          return "#fa8c16"; // 待付款 - 橙色
        case "2":
          return "#2db7f5"; // 已付款 - 蓝色
        case "3":
          return "#1890ff"; // 已发货 - 深蓝色
        case "4":
          return "#52c41a"; // 已送达 - 绿色
        case "5":
          return "#d9d9d9"; // 已取消 - 灰色
        default:
          return "#d9d9d9"; // 默认灰色
      }
    },

    // 修改getList方法
    getList() {
      this.loading = true;

      // 构建查询参数
      const params = {
        page: this.page,
        page_size: this.pageSize
      };

      if (this.searchKeyword) {
        params.search = this.searchKeyword;
      }

      if (this.statusFilter) {
        params.status = this.statusFilter;
      }

      // 获取当前登录用户信息
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      // 如果不是超级管理员，则添加商户ID过滤
      if (
        userInfo.id &&
        userInfo.is_superuser !== "1" &&
        userInfo.is_superuser !== 1
      ) {
        params.merchant_id = userInfo.id;
      }

      listApi(params)
        .then(res => {
          this.loading = false;

          // 处理返回的订单数据
          const orders = Array.isArray(res) ? res : res.results || [];

          this.data = orders.map((item, index) => {
            // 获取第一个订单项的商品名称作为展示
            const firstItem =
              item.items && item.items.length > 0 ? item.items[0] : null;
            const productName = firstItem
              ? firstItem.product_name || `商品ID: ${firstItem.product}`
              : "--";

            // 处理状态显示
            let status;
            switch (item.status) {
              case "pending":
                status = "1";
                break; // 待付款
              case "paid":
                status = "2";
                break; // 已付款
              case "shipped":
                status = "3";
                break; // 已发货
              case "delivered":
                status = "4";
                break; // 已送达
              case "cancelled":
                status = "5";
                break; // 已取消
              default:
                status = "0";
            }

            return {
              id: item.id,
              index: (this.page - 1) * this.pageSize + index + 1,
              username: item.recipient_name || "--", // 使用收件人姓名
              title: productName,
              total_amount: `¥${item.total_amount}`,
              status: status,
              order_time: item.created_at,
              // 存储原始数据，用于详情展示
              raw: item
            };
          });

          // 更新总记录数
          if (res.count !== undefined) {
            this.total = res.count;
          } else {
            this.total = orders.length;
          }
        })
        .catch(err => {
          this.loading = false;
          this.$message.error(
            (err.response && err.response.data && err.response.data.detail) ||
              "获取订单列表失败"
          );
        });
    },

    rowSelection() {
      return {
        onChange: (selectedRowKeys, selectedRows) => {
          this.selectedRowKeys = selectedRowKeys;
        }
      };
    },

    // 取消
    handleCancel(record) {
      const that = this;
      this.$confirm({
        title: "确定取消订单?",
        content: "取消后订单状态将无法恢复",
        onOk() {
          cancelOrderApi({
            id: record.id
          })
            .then(res => {
              that.$message.success("订单已取消");
              that.getList();
            })
            .catch(err => {
              that.$message.error(
                (err.response &&
                  err.response.data &&
                  err.response.data.detail) ||
                  "取消失败"
              );
            });
        }
      });
    },

    // 删除
    handleDelete(record) {
      const that = this;
      this.$confirm({
        title: "确定删除此订单?",
        content: "删除后数据无法恢复",
        onOk() {
          console.log(record);

          deleteApi({
            ids: record.id
          })
            .then(res => {
              that.$message.success("删除成功");
              that.getList();
            })
            .catch(err => {
              that.$message.error(
                (err.response &&
                  err.response.data &&
                  err.response.data.detail) ||
                  "删除失败"
              );
            });
        }
      });
    },

    // 批量删除
    handleBatchDelete() {
      if (this.selectedRowKeys.length <= 0) {
        this.$message.warn("请勾选要删除的订单");
        return;
      }
      const that = this;
      this.$confirm({
        title: `确定删除这${this.selectedRowKeys.length}个订单?`,
        content: "删除后数据无法恢复",
        onOk() {
          deleteApi({
            ids: that.selectedRowKeys.join(",")
          })
            .then(res => {
              that.$message.success("批量删除成功");
              that.selectedRowKeys = [];
              that.getList();
            })
            .catch(err => {
              that.$message.error(
                (err.response &&
                  err.response.data &&
                  err.response.data.detail) ||
                  "批量删除失败"
              );
            });
        }
      });
    }
  },
  mounted() {
    this.getList();
  }
};
</script>

<style lang="less" scoped>
.table-wrap {
  flex: 1;
}

.page-view {
  min-height: 100%;
  background: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.table-operation {
  height: 50px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
