<template>
  <div class="content">
    <div class="content-left">
      <div class="left-search-item">
        <h4>商品分类</h4>

        <!-- 按商户分组显示分类 -->
        <div v-if="showMerchantCategories" class="merchant-categories">
          <div
            v-for="merchant in merchantCategories"
            :key="merchant.merchant_id"
            class="merchant-category-group"
          >
            <div class="merchant-name">{{ merchant.merchant_name }}</div>
            <div class="merchant-categories-list">
              <a-tag
                v-for="category in merchant.categories"
                :key="category.id"
                :color="selectedCategoryId === category.id ? '#1890ff' : ''"
                @click="selectCategory(category.id)"
                class="category-tag"
              >
                {{ category.name }}
              </a-tag>
            </div>
          </div>
        </div>

        <!-- 传统树形分类 -->
        <a-tree
          v-else
          :tree-data="cData"
          :selected-keys="selectedKeys"
          @select="onSelect"
          style="min-height: 220px;"
        >
        </a-tree>
      </div>
      <!-- <div class="left-search-item">
        <h4>热门标签</h4>
        <div class="tag-view tag-flex-view">
          <span
            class="tag"
            :class="{ 'tag-select': selectTagId === item.id }"
            v-for="item in tagData"
            :key="item.id"
            @click="clickTag(item.id)"
            >{{ item.title }}</span
          >
        </div>
      </div> -->
    </div>
    <div class="content-right">
      <div class="top-select-view flex-view">
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
      <a-spin :spinning="loading" style="min-height: 200px;">
        <div class="pc-thing-list flex-view">
          <div
            v-for="item in pageData"
            :key="item.id"
            @click="handleDetail(item)"
            class="thing-item item-column-3"
            style="padding: 20px;"
          >
            <div class="img-view">
              <img :src="item.cover || 'https://via.placeholder.com/186x200'" />
            </div>

            <div class="info-view">
              <h3 class="thing-name">{{ item.title.substring(0, 12) }}</h3>
              <span>
                <span class="a-price-symbol">¥</span>
                <span class="a-price">{{ item.price }}</span>
              </span>
              <div class="category-tag">{{ item.categoryName }}</div>
              <div class="stock-info">库存: {{ item.stock }}</div>
            </div>
          </div>
          <div v-if="pageData.length <= 0 && !loading" class="no-data" style="">
            暂无数据
          </div>
        </div>
      </a-spin>
      <div class="page-view" style="">
        <a-pagination
          v-model="page"
          size="small"
          @change="changePage"
          :hideOnSinglePage="false"
          :defaultPageSize="pageSize"
          :total="total"
          :showTotal="total => `共${total}条商品`"
        />
      </div>
    </div>
  </div>
</template>

<script>
import {
  getProducts,
  getCategories,
  getMerchantCategories
} from "@/api/product";

export default {
  name: "Content",
  data() {
    return {
      selectX: 0,
      selectTagId: -1,
      cData: [],
      selectedKeys: [],
      tagData: [],
      loading: false,

      tabData: ["最新", "最热", "推荐"],
      selectTabIndex: 0,
      tabUnderLeft: 12,

      thingData: [], // 原始数据缓存
      pageData: [], // 当前页显示数据

      page: 1,
      total: 0,
      pageSize: 10, // 与后端一致的页大小

      // 按商户分组的分类
      showMerchantCategories: true, // 是否显示按商户分组的分类
      merchantCategories: [], // 按商户分组的分类数据
      selectedCategoryId: null // 当前选中的分类ID
    };
  },
  mounted() {
    this.initSider();
    this.getThingList({});
  },
  methods: {
    initSider() {
      // 获取商品分类（传统树形结构）
      getCategories()
        .then(response => {
          console.log("分类数据:", response);
          // 处理分页数据结构
          const categories = response.results || response;

          // 将后端分类数据转换为树形结构
          this.cData = categories.map(category => {
            return {
              title: category.name,
              key: category.id,
              value: category.id,
              selectable: true
            };
          });
        })
        .catch(error => {
          console.error("获取分类失败:", error);
          this.$message.error("获取分类数据失败");
        });

      // 获取按商户分组的分类
      getMerchantCategories()
        .then(response => {
          console.log("按商户分组的分类数据:", response);

          // 如果没有数据，回退到传统树形结构
          if (!response || response.length === 0) {
            this.showMerchantCategories = false;
            return;
          }

          this.merchantCategories = response;
        })
        .catch(error => {
          console.error("获取按商户分组的分类失败:", error);
          this.$message.error("获取分类数据失败");
          // 如果获取失败，回退到传统树形结构
          this.showMerchantCategories = false;
        });

      // 模拟标签数据，因为后端暂未实现
      this.tagData = [
        { id: 1, title: "热门" },
        { id: 2, title: "促销" },
        { id: 3, title: "新品" },
        { id: 4, title: "限时" }
      ];
    },
    getSelectedKey() {
      if (this.selectedKeys.length > 0) {
        return this.selectedKeys[0];
      } else {
        return -1;
      }
    },
    onSelect(selectedKeys) {
      this.selectedKeys = selectedKeys;
      console.log("选中分类ID:", this.selectedKeys[0]);
      if (this.selectedKeys.length > 0) {
        this.page = 1; // 切换分类时重置到第一页
        this.getThingList({ c: this.getSelectedKey() });
      }
      this.selectTagId = -1;
      this.selectedCategoryId = null; // 清除商户分类选中状态
    },

    // 选择商户分类
    selectCategory(categoryId) {
      console.log("选中商户分类ID:", categoryId);
      this.selectedCategoryId = categoryId;
      this.selectedKeys = []; // 清除树形分类选中状态
      this.selectTagId = -1; // 清除标签选中状态
      this.page = 1; // 切换分类时重置到第一页
      this.getThingList({ c: categoryId });
    },
    clickTag(index) {
      this.selectedKeys = [];
      this.selectTagId = index;
      this.selectedCategoryId = null; // 清除商户分类选中状态
      this.page = 1; // 切换标签时重置到第一页
      this.getThingList({ tag: this.selectTagId });
    },
    search() {
      const keyword = this.$refs.keyword.value;
      console.log("搜索关键词:", keyword);
      this.page = 1; // 搜索时重置到第一页
      this.getThingList({ keyword: keyword });
    },
    // 最新|最热|推荐
    selectTab(index) {
      this.selectTabIndex = index;
      this.tabUnderLeft = 12 + 53 * index;
      console.log("选中排序方式:", this.tabData[index]);
      let sort = index === 0 ? "recent" : index === 1 ? "hot" : "recommend";
      const data = { sort: sort };
      if (this.selectTagId !== -1) {
        data["tag"] = this.selectTagId;
      } else {
        data["c"] = this.getSelectedKey();
      }
      this.page = 1; // 切换排序时重置到第一页
      this.getThingList(data);
    },
    handleDetail(item) {
      // 跳转新页面
      let text = this.$router.resolve({
        name: "detail",
        query: { id: item.id }
      });
      window.open(text.href, "_blank");
    },
    // 分页事件 - 直接从API获取对应页的数据
    changePage(page) {
      this.page = page;
      console.log("切换到第" + this.page + "页");

      // 构建当前查询参数
      const params = { page: this.page };

      // 保留当前的筛选条件
      if (this.selectTagId !== -1) {
        params.tag = this.selectTagId;
      }

      const selectedCategoryId = this.getSelectedKey();
      if (selectedCategoryId !== -1) {
        params.c = selectedCategoryId;
      }

      // 保留当前排序方式
      if (this.selectTabIndex !== null) {
        params.sort =
          this.selectTabIndex === 0
            ? "recent"
            : this.selectTabIndex === 1
            ? "hot"
            : "recommend";
      }

      // 重新获取数据
      this.getThingList(params);
    },
    getThingList(params) {
      this.loading = true;

      // 处理排序参数
      const queryParams = { ...params };

      // 添加分页参数
      queryParams.page = this.page;
      queryParams.page_size = this.pageSize;

      // 处理排序字段映射
      if (queryParams.sort) {
        // 如果是推荐，使用推荐API
        if (queryParams.sort === "recommend") {
          queryParams.recommend = "true";
        } else {
          const sortMap = {
            recent: "-created_at", // 最新，按创建时间倒序
            hot: "-stock" // 最热，暂用库存量倒序
          };
          queryParams.ordering = sortMap[queryParams.sort];
        }
        delete queryParams.sort;
      }

      // 将分类id处理成category参数
      if (queryParams.c && queryParams.c !== -1) {
        queryParams.category = queryParams.c;
        delete queryParams.c;
      }

      // 将搜索关键词处理成search参数
      if (queryParams.keyword) {
        queryParams.search = queryParams.keyword;
        delete queryParams.keyword;
      }

      console.log("发送商品请求参数:", queryParams);

      // 使用API接口获取商品数据
      getProducts(queryParams)
        .then(response => {
          this.loading = false;
          console.log("获取到商品数据:", response);

          // 判断是否是分页结构的返回
          const isPagedResponse = response.results !== undefined;

          // 处理返回的商品数据
          const products = isPagedResponse ? response.results : response;

          // 设置总数，用于分页
          if (isPagedResponse) {
            this.total = response.count || 0;
          } else {
            this.total = products.length;
          }

          // 转换商品数据格式
          this.pageData = products.map(product => {
            return {
              id: product.id,
              title: product.name || "",
              price: product.price || "0.00",
              cover: product.image_url || "https://via.placeholder.com/186x200",
              description: product.description || "",
              stock: product.stock || 0,
              categoryId: product.category,
              categoryName: product.category_name || "未分类"
            };
          });

          console.log("处理后的商品数据:", this.pageData);
        })
        .catch(error => {
          console.error("获取商品列表失败:", error);
          this.loading = false;
          this.$message.error("获取商品数据失败，请稍后重试");
        });
    }
  }
};
</script>

<style scoped lang="less">
// 保留原有样式

// 添加一些新的样式
.category-tag {
  font-size: 12px;
  background-color: #f5f5f5;
  color: #666;
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
  margin-top: 8px;
}

.stock-info {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

// 商户分类样式
.merchant-categories {
  margin-top: 10px;
}

.merchant-category-group {
  margin-bottom: 15px;
}

.merchant-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid #1890ff;
}

.merchant-categories-list {
  display: flex;
  flex-wrap: wrap;
  margin-left: 7px;
}

.merchant-categories-list .category-tag {
  margin-right: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.merchant-categories-list .category-tag:hover {
  background-color: #e6f7ff;
  color: #1890ff;
}

.content-right {
  .pc-thing-list {
    .thing-item {
      // 添加卡片阴影效果
      transition: all 0.3s;
      border-radius: 4px;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-5px);
      }

      .img-view {
        display: flex;
        justify-content: center;
        img {
          object-fit: contain;
        }
      }
    }
  }
}
</style>

<style scoped lang="less">
.content {
  display: flex;
  flex-direction: row;
  width: 1100px;
  margin: 80px auto;
}

.content-left {
  width: 220px;
  margin-right: 32px;
}

.left-search-item {
  overflow: hidden;
  border-bottom: 1px solid #cedce4;
  margin-top: 24px;
  padding-bottom: 24px;
}

h4 {
  color: #4d4d4d;
  font-weight: 600;
  font-size: 16px;
  line-height: 24px;
  height: 24px;
}

.category-item {
  cursor: pointer;
  color: #333;
  margin: 12px 0 0;
  padding-left: 16px;
}

ul {
  margin: 0;
  padding: 0;
}

ul {
  list-style-type: none;
}

li {
  margin: 4px 0 0;
  display: list-item;
  text-align: -webkit-match-parent;
}

.child {
  color: #333;
  padding-left: 16px;
}

.child:hover {
  color: #4684e2;
}

.select {
  color: #4684e2;
}

.flex-view {
  -webkit-box-pack: justify;
  -ms-flex-pack: justify;
  //justify-content: space-between;
  display: flex;
}

.name {
  font-size: 14px;
}

.name:hover {
  color: #4684e2;
}

.count {
  font-size: 14px;
  color: #999;
}

.check-item {
  font-size: 0;
  height: 18px;
  line-height: 12px;
  margin: 12px 0 0;
  color: #333;
  cursor: pointer;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
}

.check-item input {
  cursor: pointer;
}

.check-item label {
  font-size: 14px;
  margin-left: 12px;
  cursor: pointer;
  -webkit-box-flex: 1;
  -ms-flex: 1;
  flex: 1;
}

.tag-view {
  -ms-flex-wrap: wrap;
  flex-wrap: wrap;
  margin-top: 4px;
}

.tag-flex-view {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}

.tag {
  background: #fff;
  border: 1px solid #a1adc6;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  border-radius: 16px;
  height: 20px;
  line-height: 18px;
  padding: 0 8px;
  margin: 8px 8px 0 0;
  cursor: pointer;
  font-size: 12px;
  color: #152833;
}

.tag:hover {
  background: #4684e3;
  color: #fff;
  border: 1px solid #4684e3;
}

.tag-select {
  background: #4684e3;
  color: #fff;
  border: 1px solid #4684e3;
}

.content-right {
  -webkit-box-flex: 1;
  -ms-flex: 1;
  flex: 1;
  padding-top: 12px;

  .pc-search-view {
    margin: 0 0 24px;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;

    .search-icon {
      width: 20px;
      height: 20px;
      -webkit-box-flex: 0;
      -ms-flex: 0 0 20px;
      flex: 0 0 20px;
      margin-right: 16px;
    }

    input {
      outline: none;
      border: 0px;
      -webkit-box-flex: 1;
      -ms-flex: 1;
      flex: 1;
      border-bottom: 1px solid #cedce4;
      color: #152844;
      font-size: 14px;
      height: 22px;
      line-height: 22px;
      -ms-flex-item-align: end;
      align-self: flex-end;
      padding-bottom: 8px;
    }

    .clear-search-icon {
      position: relative;
      left: -20px;
      cursor: pointer;
    }

    button {
      outline: none;
      border: none;
      font-size: 14px;
      color: #fff;
      background: #288dda;
      border-radius: 32px;
      width: 88px;
      height: 32px;
      line-height: 32px;
      margin-left: 2px;
      cursor: pointer;
    }

    .float-count {
      color: #999;
      margin-left: 24px;
    }
  }

  .flex-view {
    display: flex;
  }

  .top-select-view {
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    height: 40px;
    line-height: 40px;

    .type-view {
      position: relative;
      font-weight: 400;
      font-size: 18px;
      color: #5f77a6;

      .type-tab {
        margin-right: 32px;
        cursor: pointer;
      }

      .type-tab-select {
        color: #152844;
        font-weight: 600;
        font-size: 20px;
      }

      .tab-underline {
        position: absolute;
        bottom: 0;
        //left: 22px;
        width: 16px;
        height: 4px;
        background: #4684e2;
        -webkit-transition: left 0.3s;
        transition: left 0.3s;
      }
    }

    .order-view {
      position: relative;
      color: #6c6c6c;
      font-size: 14px;

      .title {
        margin-right: 8px;
      }

      .tab {
        color: #999;
        margin-right: 20px;
        cursor: pointer;
      }

      .tab-select {
        color: #152844;
      }

      .tab-underline {
        position: absolute;
        bottom: 0;
        left: 84px;
        width: 16px;
        height: 4px;
        background: #4684e2;
        -webkit-transition: left 0.3s;
        transition: left 0.3s;
      }
    }
  }

  .pc-thing-list {
    -ms-flex-wrap: wrap;
    flex-wrap: wrap;

    .thing-item {
      min-width: 255px;
      max-width: 255px;
      position: relative;
      flex: 1;
      margin-right: 20px;
      height: fit-content;
      overflow: hidden;
      margin-top: 26px;
      margin-bottom: 36px;
      cursor: pointer;

      .img-view {
        //text-align: center;
        height: 200px;
        width: 255px;

        img {
          height: 200px;
          width: 186px;
          margin: 0 auto;
          background-size: contain;
        }
      }

      .info-view {
        //background: #f6f9fb;
        overflow: hidden;
        padding: 0 16px;
        .thing-name {
          line-height: 32px;
          margin-top: 12px;
          color: #0f1111 !important;
          font-size: 15px !important;
          font-weight: 400 !important;
          font-style: normal !important;
          text-transform: none !important;
          text-decoration: none !important;
        }

        .price {
          color: #ff7b31;
          font-size: 20px;
          line-height: 20px;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .translators {
          color: #6f6f6f;
          font-size: 12px;
          line-height: 14px;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .no-data {
      height: 200px;
      line-height: 200px;
      text-align: center;
      width: 100%;
      font-size: 16px;
      color: #152844;
    }
  }

  .page-view {
    width: 100%;
    text-align: center;
    margin-top: 48px;
  }
}

.a-price-symbol {
  top: -0.5em;
  font-size: 12px;
}
.a-price {
  color: #0f1111;
  font-size: 21px;
}
</style>
