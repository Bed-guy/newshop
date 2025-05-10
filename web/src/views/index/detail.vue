<template>
  <div class="detail" style="padding-top: 150px;">
    <Header />
    <div class="detail-content">
      <div class="thing-infos-view flex-view">
        <!-- 商品图片 -->
        <div class="thing-img-box">
          <img :src="detailData ? detailData.cover : ''" alt="商品图片" />
        </div>

        <!-- 商品信息 -->
        <div class="thing-info-box">
          <div class="thing-name">
            {{ detailData ? detailData.title : "加载中..." }}
          </div>
          <div class="thing-state">
            <span class="a-price">
              <span class="a-price-symbol">¥</span>
              {{ detailData ? detailData.price : "0.00" }}
            </span>
          </div>
          <div class="authors">
            <span>库存: {{ detailData ? detailData.stock : 0 }}件</span>
          </div>
          <div class="tags">
            <div class="category-box">
              <span class="title">分类:</span>
              {{ detailData ? detailData.categoryName : "" }}
            </div>
          </div>
          <button class="buy-btn" @click="handleOrder">
            <span>立即购买</span>
          </button>
        </div>

        <!-- 操作区域 -->
        <div class="thing-counts">
          <div class="count-item flex-view" @click="addToCart">
            <div class="count-img">
              <!-- <img src="@/assets/img/thing/add.png" alt="加入购物车" /> -->
            </div>
            <div class="count-box flex-view">
              <div class="count-text-box">
                <span class="count-title">加入购物车</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="thing-content-view flex-view">
        <!-- 商品详细信息 -->
        <div class="main-content">
          <div class="main-tab">
            <div class="order-view">
              <span class="title"></span>
              <span
                class="tab"
                :class="selectTabIndex === index ? 'tab-select' : ''"
                v-for="(item, index) in tabData"
                :key="index"
                @click="selectTab(index)"
              >
                {{ item }}
              </span>
              <span
                :style="{ left: tabUnderLeft + 'px' }"
                class="tab-underline"
              ></span>
            </div>
          </div>
          <div class="text">{{ detailData ? detailData.description : "" }}</div>
        </div>

        <!-- 推荐商品 -->
        <div class="recommend">
          <p class="title">相关推荐</p>
          <div class="things">
            <div
              v-for="item in recommendData"
              :key="item.id"
              class="thing-item"
              @click="handleDetail(item)"
            >
              <div class="img-view">
                <img :src="item.cover" alt="商品图片" />
              </div>
              <div class="info-view">
                <p class="thing-name">{{ item.title }}</p>
                <p class="price">
                  <span>¥{{ item.price }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
import { addToCartApi } from "@/api/cart"; // 导入购物车API
import axios from "@/utils/request.js"; // 导入封装好的axios实例
import Header from "@/views/index/components/header";
import Footer from "@/views/index/components/footer";

export default {
  components: {
    Header,
    Footer
  },
  data() {
    return {
      thingId: "",
      detailData: undefined,
      tabUnderLeft: 6,
      tabData: ["简介"],
      selectTabIndex: 0,
      recommendData: [],
      baseUrl: "http://localhost:8000" // 这个可以移除，因为request.js中已配置
    };
  },
  mounted() {
    this.thingId = this.$route.query.id;
    if (!this.thingId) {
      this.$message.error("商品ID不存在");
      return;
    }

    this.getThingDetail();
    this.getRecommendThing();
  },
  methods: {
    selectTab(index) {
      this.selectTabIndex = index;
      this.tabUnderLeft = 6 + 58 * index;
    },

    // 获取商品详情 - 使用封装的axios
    getThingDetail() {
      axios({
        url: `/api/products/${this.thingId}/`,
        method: "get"
      })
        .then(response => {
          // 这里response可能直接是数据，取决于request.js的封装
          const data = response.data || response;

          this.detailData = {
            id: data.id,
            title: data.name,
            price: data.price,
            cover: data.image_url,
            description: data.description,
            stock: data.stock,
            categoryId: data.category,
            categoryName: data.category_name
          };
        })
        .catch(error => {
          console.error("获取商品详情失败:", error);
          this.$message.error("获取详情失败");
        });
    },

    // 添加到购物车 - 使用API模块
    addToCart() {
      if (!this.detailData) return;

      // 使用导入的API函数
      addToCartApi({
        product_id: this.detailData.id,
        quantity: 1
      })
        .then(response => {
          this.$message.success("已添加到购物车");
        })
        .catch(error => {
          console.error("添加购物车失败:", error);
          // 判断是否需要登录
          if (error.response && error.response.status === 401) {
            this.$message.error("请先登录");
            // 可以跳转到登录页面
            this.$router.push({
              path: "/login",
              query: { redirect: this.$route.fullPath }
            });
          } else {
            this.$message.error("添加购物车失败");
          }
        });
    },

    // 处理购买操作
    handleOrder() {
      if (!this.detailData) return;

      // 先添加到购物车，成功后再跳转
      addToCartApi({
        product_id: this.detailData.id,
        quantity: 1
      })
        .then(response => {
          this.$message.success("已添加到购物车");

          // 跳转到确认订单页面
          this.$router.push({
            name: "confirm"
          });
        })
        .catch(error => {
          console.error("添加购物车失败:", error);
          // 判断是否需要登录
          if (error.response && error.response.status === 401) {
            this.$message.error("请先登录");
            // 可以跳转到登录页面
            this.$router.push({
              path: "/login",
              query: { redirect: this.$route.fullPath }
            });
          } else {
            this.$message.error("添加购物车失败");
          }
        });
    },

    // 获取推荐商品列表 - 使用封装的axios
    getRecommendThing() {
      axios({
        url: "/api/products/",
        method: "get",
        params: { ordering: "price" }
      })
        .then(response => {
          // 这里response可能直接是数据，取决于request.js的封装
          const products = response.results || response;

          this.recommendData = products
            .filter(product => product.id !== parseInt(this.thingId)) // 排除当前商品
            .map(product => {
              return {
                id: product.id,
                title: product.name,
                price: product.price,
                cover: product.image_url,
                description: product.description,
                stock: product.stock,
                categoryId: product.category,
                categoryName: product.category_name
              };
            });
        })
        .catch(error => {
          console.error("获取推荐商品失败:", error);
        });
    },

    // 点击推荐商品，跳转到详情页
    handleDetail(item) {
      // 在新标签页打开商品详情
      let route = this.$router.resolve({
        name: "detail",
        query: { id: item.id }
      });
      window.open(route.href, "_blank");
    }
  }
};
</script>

<!-- filepath: c:\Users\53746\PycharmProjects\DjangoProject\web\src\views\index\detail.vue -->
<style scoped lang="less">
/* 生鲜主题色彩变量 */
@primary-color: #4caf50; /* 新鲜草绿色 */
@heading-color: #2e7d32; /* 深叶绿色 */
@text-color: #33691e; /* 橄榄绿文本 */
@border-color: #aed581; /* 嫩芽绿边框 */
@background-light: #f9fbf6; /* 清新背景色 */
@accent-color: #ff8f00; /* 成熟橙色 */
@error-color: #e53935; /* 鲜草莓红 */

.detail {
  background-color: @background-light;
  min-height: 100vh;
  position: relative;

  /* 添加自然元素装饰 */
  &::before {
    content: "";
    position: absolute;
    top: 120px;
    right: 0;
    width: 300px;
    height: 300px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M42,-52.3C55.9,-39.9,69.7,-28.2,75.6,-12.9C81.6,2.4,79.6,21.2,70.2,34.5C60.9,47.8,44.2,55.4,27.1,61.7C10,68,-7.5,72.8,-23.6,69.2C-39.7,65.6,-54.4,53.5,-65.8,37.8C-77.1,22,-85.2,2.7,-81.9,-14.5C-78.5,-31.6,-63.8,-46.5,-47.5,-58.7C-31.2,-70.9,-13.3,-80.4,0.9,-81.5C15.1,-82.7,28.1,-64.7,42,-52.3Z" fill="%234caf5011" transform="translate(100 100)" /></svg>');
    background-repeat: no-repeat;
    background-size: contain;
    opacity: 0.2;
    z-index: 0;
    pointer-events: none;
  }
}

.detail-content {
  display: flex;
  flex-direction: column;
  width: 1100px;
  margin: 20px auto;
  position: relative;
  z-index: 1;
  padding: 20px 30px 40px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(5px);
}

.flex-view {
  display: flex;
}

/* 商品信息展示区域 */
.thing-infos-view {
  display: flex;
  margin: 20px 0 40px;
  overflow: hidden;
  position: relative;

  .thing-img-box {
    flex: 0 0 320px;
    margin: 0 40px 0 0;
    transition: transform 0.3s;

    img {
      width: 280px;
      height: 280px;
      display: block;
      margin: 0 auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
      transition: all 0.3s;

      &:hover {
        transform: scale(1.02);
        box-shadow: 0 8px 20px rgba(76, 175, 80, 0.15);
      }
    }

    /* 添加水滴装饰效果 */
    &::after {
      content: "";
      position: absolute;
      bottom: -10px;
      left: 120px;
      width: 80px;
      height: 20px;
      background: radial-gradient(
        ellipse at center,
        rgba(174, 213, 129, 0.3) 0%,
        rgba(255, 255, 255, 0) 70%
      );
      border-radius: 50%;
      filter: blur(3px);
    }
  }

  .thing-info-box {
    text-align: left;
    padding: 10px 0;
    margin: 0;
    position: relative;
    flex: 1;

    .thing-name {
      line-height: 1.4;
      margin: 0 0 16px;
      color: @heading-color !important;
      font-size: 24px !important;
      font-weight: 600 !important;
      padding-bottom: 8px;
      position: relative;

      &::after {
        content: "";
        position: absolute;
        left: 0;
        bottom: 0;
        width: 40px;
        height: 3px;
        background: linear-gradient(to right, @primary-color, transparent);
        border-radius: 2px;
      }
    }

    .thing-state {
      height: 32px;
      line-height: 32px;
      margin: 16px 0;

      .a-price {
        color: @accent-color;
        font-size: 28px;
        font-weight: 600;

        .a-price-symbol {
          top: -0.75em;
          font-size: 16px;
          margin-right: 2px;
          color: @accent-color;
        }
      }
    }

    .authors {
      line-height: 24px;
      font-size: 16px;
      margin: 16px 0;
      display: flex;
      align-items: center;
      color: @text-color;

      span {
        position: relative;
        padding-left: 24px;

        &::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2333691e"><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M9,17H7v-7h2V17z M13,17h-2V7h2V17z M17,17h-2v-4h2V17z"/></svg>');
          background-repeat: no-repeat;
          background-size: contain;
        }
      }
    }

    .tags {
      position: relative;
      margin-top: 20px;
      display: inline-block;

      .category-box {
        color: @text-color;
        font-size: 16px;
        background-color: rgba(174, 213, 129, 0.2);
        padding: 6px 12px;
        border-radius: 20px;
        display: inline-block;

        .title {
          color: #787878;
          margin-right: 4px;
        }
      }
    }
  }

  /* 操作区域 */
  .thing-counts {
    flex: 0 0 180px;
    margin-left: 20px;

    .count-item {
      height: 64px;
      align-items: center;
      cursor: pointer;
      position: relative;
      margin-top: 20px;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);

        .count-box {
          border-color: @border-color;
        }

        .count-title {
          color: @primary-color;
        }
      }
    }

    .count-img {
      flex: 0 0 32px;
      height: 32px;
      margin-right: 16px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234caf50"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="%234caf50"/></svg>');
      background-repeat: no-repeat;
      background-size: contain;
    }

    .count-box {
      position: relative;
      border-bottom: 2px solid rgba(206, 220, 228, 0.5);
      align-items: center;
      justify-content: space-between;
      flex: 1;
      height: 100%;
      transition: all 0.3s;
    }

    .count-text-box {
      .count-title {
        color: @text-color;
        font-weight: 600;
        font-size: 16px;
        line-height: 18px;
        display: block;
        height: 18px;
        transition: all 0.3s;
      }
    }
  }
}

/* 购买按钮样式 */
.buy-btn {
  cursor: pointer;
  display: block;
  background: linear-gradient(120deg, @primary-color, @heading-color);
  border-radius: 8px;
  text-align: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  height: 46px;
  line-height: 46px;
  width: 140px;
  outline: none;
  border: none;
  margin-top: 24px;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(1px);
  }

  span {
    vertical-align: middle;
    position: relative;
    padding-right: 24px;

    &::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M13 3h-2v10h2V3zm0 12h-2v2h2v-2zm6-10v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>');
      background-repeat: no-repeat;
      background-size: contain;
      transition: all 0.3s;
    }

    &:hover::after {
      transform: translateY(-50%) translateX(3px);
    }
  }
}

/* 商品内容区域 */
.thing-content-view {
  margin-top: 40px;
  padding-bottom: 50px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: -20px;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(174, 213, 129, 0.5),
      transparent
    );
  }
}

.main-content {
  flex: 1;
  margin-right: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;

  .main-tab {
    border-bottom: none;
    background: linear-gradient(90deg, rgba(174, 213, 129, 0.2), white);
  }

  .order-view {
    position: relative;
    color: @text-color;
    font-size: 16px;
    line-height: 50px;
    padding-left: 20px;

    .tab {
      margin-right: 30px;
      cursor: pointer;
      color: @text-color;
      font-size: 16px;
      cursor: pointer;
      position: relative;
      transition: all 0.3s;

      &:hover {
        color: @primary-color;
      }
    }

    .tab-select {
      color: @heading-color;
      font-weight: 600;
    }

    .tab-underline {
      position: absolute;
      bottom: 0;
      left: 20px;
      width: 24px;
      height: 3px;
      background: @primary-color;
      border-radius: 3px 3px 0 0;
      transition: all 0.3s ease;
    }
  }

  .text {
    color: #484848;
    font-size: 16px;
    line-height: 1.8;
    padding: 20px 30px;
    margin: 0;
    white-space: pre-wrap;
  }
}

/* 商品推荐区域 */
.recommend {
  flex: 0 0 280px;

  .title {
    font-weight: 600;
    font-size: 20px;
    line-height: 26px;
    color: @heading-color;
    margin-bottom: 20px;
    padding-bottom: 10px;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 40px;
      height: 3px;
      background: linear-gradient(to right, @primary-color, transparent);
      border-radius: 2px;
    }
  }

  .things {
    border-top: 1px solid rgba(174, 213, 129, 0.3);

    .thing-item {
      position: relative;
      margin-right: 0;
      overflow: hidden;
      margin-top: 20px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px dashed rgba(174, 213, 129, 0.3);
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-3px);

        img {
          transform: scale(1.05);
        }

        .thing-name {
          color: @primary-color !important;
        }
      }

      .img-view {
        height: 160px;
        width: 100%;
        overflow: hidden;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);

        img {
          height: 160px;
          width: 160px;
          margin: 0 auto;
          display: block;
          object-fit: cover;
          transition: transform 0.5s;
        }
      }

      .info-view {
        overflow: hidden;
        padding: 0 8px;

        .thing-name {
          line-height: 1.4;
          margin-top: 12px;
          color: @text-color !important;
          font-size: 15px !important;
          font-weight: 500 !important;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          transition: all 0.3s;
        }
      }
    }
  }
}
</style>
