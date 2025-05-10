<template>
  <div class="content-list">
    <div class="list-title">我的订单</div>
    <!-- <a-tabs default-active-key="1" @change="onTabChange">
      <a-tab-pane key="1" tab="全部"> </a-tab-pane>
      <a-tab-pane key="2" tab="待付款"> </a-tab-pane>
      <a-tab-pane key="3" tab="已支付"> </a-tab-pane>
      <a-tab-pane key="4" tab="已取消"> </a-tab-pane>
    </a-tabs> -->
    <div class="list-content">
      <div v-if="loading" class="loading-container">
        <a-spin tip="加载中..."></a-spin>
      </div>
      <div v-else-if="orderData.length === 0" class="empty-container">
        <a-empty description="暂无订单" />
      </div>
      <div v-else class="order-list">
        <div class="order-item-view" v-for="item in orderData" :key="item.id">
          <div class="header flex-view">
            <div class="left">
              <span class="text">订单号</span>
              <span class="num mg-4">#</span>
              <span class="num">{{ item.order_number || item.id }}</span>
              <span class="time">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="right">
              <!-- 待支付订单可以取消 -->
              <a-popconfirm
                v-if="item.status === 'pending'"
                title="确定取消订单？"
                ok-text="是"
                cancel-text="否"
                @confirm="handleCancel(item)"
              >
                <a-button
                  type="primary"
                  size="small"
                  style="margin-right: 24px;"
                  >取消</a-button
                >
              </a-popconfirm>
              <!-- 待支付订单可以支付 -->
              <a-button
                v-if="item.status === 'pending'"
                type="danger"
                size="small"
                style="margin-right: 24px;"
                @click="handlePay(item)"
              >
                支付
              </a-button>
              <span class="text">订单状态</span>
              <span class="state" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>
          <div class="content flex-view">
            <div class="left-list">
              <div
                v-for="orderItem in item.items"
                :key="orderItem.id"
                class="list-item flex-view"
              >
                <img :src="orderItem.image_url" class="thing-img" />
                <div class="detail flex-between flex-view">
                  <div class="flex-between flex-top flex-view">
                    <h2 class="name">{{ orderItem.product_name }}</h2>
                    <span class="count">x{{ orderItem.quantity }}</span>
                  </div>
                  <div class="flex-between flex-center flex-view">
                    <span class="type">{{
                      orderItem.category_name || ""
                    }}</span>
                    <span class="price">¥{{ orderItem.price }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- <div class="right-info">
              <p class="title">收货信息</p>
              <p class="name">
                {{ item.recipient_name }} {{ item.recipient_phone }}
              </p>
              <p class="text mg">{{ item.shipping_address }}</p>
              <p class="title">物流单号</p>
              <p class="text">
                {{ item.tracking_number || "暂未发货" }}
              </p>
              <p class="title">备注信息</p>
              <p class="text">
                {{ item.remarks || "无" }}
              </p>
            </div> -->
          </div>
          <!-- <div class="bottom flex-view">
            <div class="left">
              <span class="text">共{{ getTotalItems(item.items) }}件商品</span>
              <span class="open" @click="handleDetail(item.items[0].product.id)"
                >商品详情</span
              >
            </div>
            <div class="right flex-view">
              <span class="text">总计</span>
              <span class="num">¥{{ item.total_amount }}</span>
              <span class="text">优惠</span>
              <span class="num">¥0</span>
              <span class="text">实际支付</span>
              <span class="money">¥{{ item.total_amount }}</span>
            </div>
          </div> -->
        </div>
      </div>
      <div class="pagination" v-if="orderData.length > 0">
        <a-pagination
          :current="currentPage"
          :total="totalOrders"
          :page-size="pageSize"
          @change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script>
import request from "@/utils/request";

export default {
  name: "OrderView",
  data() {
    return {
      orderData: [],
      loading: false,
      statusFilter: "",
      currentPage: 1,
      pageSize: 5,
      totalOrders: 0,
      defaultImage:
        "https://file.ituring.com.cn/SmallCover/2212c21242c05ebc49f3"
    };
  },
  mounted() {
    this.getOrderList();
  },
  methods: {
    onTabChange(key) {
      // 根据不同标签页过滤订单状态
      if (key === "1") {
        this.statusFilter = ""; // 全部订单
      } else if (key === "2") {
        this.statusFilter = "pending"; // 待付款
      } else if (key === "3") {
        this.statusFilter = "paid"; // 已支付
      } else if (key === "4") {
        this.statusFilter = "cancelled"; // 已取消
      }
      this.currentPage = 1; // 重置页码
      this.getOrderList();
    },

    // 获取订单列表
    getOrderList() {
      this.loading = true;

      // 构建查询参数
      let params = {};
      if (this.statusFilter) {
        params.status = this.statusFilter;
      }

      // 添加分页参数
      params.page = this.currentPage;
      params.page_size = this.pageSize;

      // 调用获取订单列表API
      request({
        url: "/api/orders/",
        method: "get",
        params: params
      })
        .then(response => {
          // 处理返回的数据
          if (response.results) {
            // 分页格式的响应
            this.orderData = response.results;
            this.totalOrders = response.count;
          } else if (Array.isArray(response)) {
            // 数组格式的响应
            this.orderData = response;
            this.totalOrders = response.length;
          } else {
            // 其他格式处理
            this.orderData = [];
            this.totalOrders = 0;
            console.error("Unexpected response format:", response);
          }
          this.loading = false;
        })
        .catch(err => {
          console.error("获取订单列表失败:", err);
          this.$message.error("获取订单列表失败");
          this.loading = false;
        });
    },

    // 处理页面变化
    handlePageChange(page) {
      this.currentPage = page;
      this.getOrderList();
    },

    // 查看商品详情
    handleDetail(productId) {
      if (!productId) return;
      // 跳转新页面
      let route = this.$router.resolve({
        name: "detail",
        query: { id: productId }
      });
      window.open(route.href, "_blank");
    },

    // 支付订单
    handlePay(item) {
      // 跳转到支付页面
      this.$router.push({
        name: "pay",
        query: {
          amount: item.total_amount,
          order_id: item.id
        }
      });
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    // 获取订单状态文本
    getStatusText(status) {
      switch (status) {
        case "pending":
          return "待支付";
        case "paid":
          return "已支付";
        case "shipped":
          return "已发货";
        case "completed":
          return "已完成";
        case "cancelled":
          return "已取消";
        default:
          return "未知状态";
      }
    },

    // 获取状态对应的CSS类
    getStatusClass(status) {
      switch (status) {
        case "pending":
          return "status-pending";
        case "paid":
          return "status-paid";
        case "shipped":
          return "status-shipped";
        case "completed":
          return "status-completed";
        case "cancelled":
          return "status-cancelled";
        default:
          return "";
      }
    },

    // 计算订单总商品数量
    getTotalItems(items) {
      if (!items || !items.length) return 0;
      return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }
  }
};
</script>

<!-- filepath: c:\Users\53746\PycharmProjects\DjangoProject\web\src\views\index\user\order-view.vue -->
<style scoped lang="less">
/* 生鲜主题色彩变量 */
@primary-color: #4caf50; /* 新鲜草绿色 */
@heading-color: #2e7d32; /* 深叶绿色 */
@text-color: #33691e; /* 橄榄绿文本 */
@border-color: #aed581; /* 嫩芽绿边框 */
@background-light: #f9fbf6; /* 清新背景色 */
@accent-color: #ff8f00; /* 成熟橙色 */
@error-color: #e53935; /* 鲜草莓红 */

.flex-view {
  display: flex;
}

.content-list {
  flex: 1;

  .list-title {
    color: @heading-color;
    font-weight: 600;
    font-size: 22px;
    line-height: 28px;
    height: auto;
    margin-bottom: 24px;
    padding-bottom: 10px;
    border-bottom: 2px solid rgba(174, 213, 129, 0.3);
    position: relative;

    &::after {
      content: "";
      position: absolute;
      left: 0;
      bottom: -2px;
      height: 2px;
      width: 60px;
      background: linear-gradient(to right, @primary-color, transparent);
    }
  }

  .empty-container {
    margin: 40px 0;
    padding: 40px;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    text-align: center;

    /deep/ .ant-empty-image {
      opacity: 0.6;
      filter: grayscale(0.2) sepia(0.2) hue-rotate(60deg);
    }

    /deep/ .ant-empty-description {
      color: #90a4ae;
      font-size: 16px;
      margin-top: 16px;
    }
  }

  .loading-container {
    margin: 40px 0;
    text-align: center;

    /deep/ .ant-spin {
      color: @primary-color;

      .ant-spin-dot-item {
        background-color: @primary-color;
      }
    }
  }
}

.order-list {
  .order-item-view {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    margin-bottom: 24px;
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.12);
    }

    .header {
      padding: 16px 24px;
      border-bottom: 1px solid rgba(174, 213, 129, 0.3);
      background-color: rgba(249, 251, 246, 0.6);
      justify-content: space-between;

      .left {
        display: flex;
        align-items: center;

        .text {
          color: @text-color;
          opacity: 0.8;
          font-size: 14px;
        }

        .num {
          color: @heading-color;
          font-weight: 600;
          font-size: 15px;
          margin-left: 6px;
        }

        .time {
          color: #6f6f6f;
          font-size: 14px;
          margin-left: 24px;
          position: relative;

          &::before {
            content: "";
            position: absolute;
            left: -12px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: @border-color;
          }
        }

        .mg-4 {
          margin-left: 4px;
        }
      }

      .right {
        display: flex;
        align-items: center;

        .text {
          color: @text-color;
          opacity: 0.8;
          font-size: 14px;
        }

        /* 按钮样式 */
        /deep/ .ant-btn-primary {
          background-color: @primary-color;
          border-color: @primary-color;
          box-shadow: 0 2px 6px rgba(76, 175, 80, 0.2);
          transition: all 0.3s;

          &:hover {
            background-color: darken(@primary-color, 5%);
            border-color: darken(@primary-color, 5%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(76, 175, 80, 0.25);
          }
        }

        /deep/ .ant-btn-danger {
          background-color: @accent-color;
          border-color: @accent-color;
          box-shadow: 0 2px 6px rgba(255, 143, 0, 0.2);

          &:hover {
            background-color: darken(@accent-color, 5%);
            border-color: darken(@accent-color, 5%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(255, 143, 0, 0.25);
          }
        }

        .state {
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 13px;
          font-weight: 600;
          margin-left: 8px;
          color: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        /* 订单状态样式 */
        .status-pending {
          background: linear-gradient(120deg, @accent-color, #ff7043);
        }

        .status-paid {
          background: linear-gradient(120deg, @primary-color, @heading-color);
        }

        .status-shipped {
          background: linear-gradient(120deg, #29b6f6, #0288d1);
        }

        .status-completed {
          background: linear-gradient(120deg, #66bb6a, #388e3c);
        }

        .status-cancelled {
          background: linear-gradient(120deg, #9e9e9e, #616161);
        }
      }
    }

    .content {
      padding: 20px 24px;
      background: white;

      .left-list {
        width: 100%;
        height: auto;
        max-height: 320px;
        overflow-y: auto;
        padding-right: 5px;

        /* 美化滚动条 */
        &::-webkit-scrollbar {
          width: 6px;
        }

        &::-webkit-scrollbar-track {
          background: rgba(174, 213, 129, 0.1);
          border-radius: 3px;
        }

        &::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, @border-color, @primary-color);
          border-radius: 3px;
        }

        .list-item {
          display: flex;
          padding: 16px 0;
          border-bottom: 1px dashed rgba(174, 213, 129, 0.3);
          height: auto;
          margin-bottom: 0;
          transition: all 0.3s;

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            background-color: rgba(249, 251, 246, 0.6);
            transform: translateX(3px);
            padding-left: 10px;
            border-radius: 8px;
          }

          .thing-img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
            margin-right: 16px;
            transition: transform 0.3s;

            &:hover {
              transform: scale(1.05);
            }
          }

          .detail {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 80px;
            padding: 4px 0;

            .flex-between {
              display: flex;
              justify-content: space-between;
              width: 100%;
            }

            .flex-top {
              align-items: flex-start;
            }

            .name {
              color: @heading-color;
              font-weight: 600;
              font-size: 16px;
              line-height: 1.4;
              margin: 0;
              flex: 1;
              padding-right: 20px;

              /* 多行文本截断 */
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .count {
              color: @text-color;
              font-size: 14px;
              font-weight: 500;
              white-space: nowrap;
            }

            .flex-center {
              align-items: center;
            }

            .type {
              color: #6f6f6f;
              font-size: 14px;
              background-color: rgba(174, 213, 129, 0.1);
              padding: 2px 8px;
              border-radius: 20px;
            }

            .price {
              color: @accent-color;
              font-weight: 600;
              font-size: 16px;

              &::before {
                content: "¥";
                font-size: 14px;
                margin-right: 1px;
              }
            }
          }
        }
      }

      .right-info {
        flex: 1;
        border-left: 1px solid rgba(174, 213, 129, 0.3);
        padding-left: 24px;
        line-height: 1.6;
        font-size: 14px;

        .title {
          color: @text-color;
          opacity: 0.8;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .name {
          color: @heading-color;
          margin-bottom: 8px;
        }

        .text {
          color: #484848;
          margin-bottom: 16px;
        }

        .mg {
          margin-bottom: 8px;
        }
      }
    }

    .bottom {
      align-items: center;
      border-top: 1px solid rgba(174, 213, 129, 0.3);
      justify-content: space-between;
      padding: 16px 24px;
      background-color: rgba(249, 251, 246, 0.4);

      .left {
        display: flex;
        align-items: center;

        .text {
          color: #6f6f6f;
          font-size: 14px;
        }

        .open {
          color: @primary-color;
          margin-left: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;

          &:hover {
            color: darken(@primary-color, 10%);

            &::after {
              width: 100%;
            }
          }

          &::after {
            content: "";
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 0;
            height: 1px;
            background-color: @primary-color;
            transition: width 0.3s;
          }
        }
      }

      .right {
        display: flex;
        align-items: center;

        .text {
          color: #6f6f6f;
          font-size: 14px;
        }

        .num {
          color: @text-color;
          margin: 0 24px 0 8px;
          font-weight: 500;
        }

        .money {
          font-weight: 700;
          font-size: 18px;
          color: @accent-color;
          margin-left: 8px;

          &::before {
            content: "¥";
            font-size: 14px;
            margin-right: 1px;
          }
        }
      }
    }
  }
}

.pagination {
  margin: 30px 0;
  text-align: center;

  /deep/ .ant-pagination-item-active {
    border-color: @primary-color;
    background-color: rgba(174, 213, 129, 0.1);

    a {
      color: @primary-color;
    }
  }

  /deep/ .ant-pagination-item:hover {
    border-color: @primary-color;

    a {
      color: @primary-color;
    }
  }

  /deep/ .ant-pagination-prev:hover .ant-pagination-item-link,
  /deep/ .ant-pagination-next:hover .ant-pagination-item-link {
    border-color: @primary-color;
    color: @primary-color;
  }
}

/* 适配移动设备 */
@media (max-width: 768px) {
  .order-list .order-item-view {
    .header {
      flex-direction: column;

      .right {
        margin-top: 12px;
        justify-content: space-between;
        width: 100%;
      }
    }

    .content {
      padding: 16px;

      .left-list .list-item {
        .thing-img {
          width: 60px;
          height: 60px;
        }

        .detail {
          height: 60px;
        }
      }
    }

    .bottom {
      flex-direction: column;

      .right {
        margin-top: 12px;
        width: 100%;
        justify-content: flex-end;
      }
    }
  }
}
</style>
