<template>
  <div class="search-container">
    <div class="search-header">
      <div class="search-bar">
        <a-input-search
          placeholder="请输入商品名称"
          enter-button="搜索"
          size="large"
          v-model="searchKeyword"
          @search="onSearch"
        />
      </div>
      <div class="search-filters">
        <a-space>
          <a-select
            placeholder="分类"
            style="width: 120px"
            @change="onCategoryChange"
            allowClear
          >
            <a-select-option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.title }}
            </a-select-option>
          </a-select>
        </a-space>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="search-results">
        <div v-if="products.length === 0 && !loading" class="no-results">
          未找到相关商品，请尝试其他关键词
        </div>

        <div class="product-grid">
          <div
            v-for="product in products"
            :key="product.id"
            class="product-card"
            @click="handleProductClick(product)"
          >
            <div class="product-image">
              <img
                :src="product.image_url || 'https://via.placeholder.com/200'"
                alt="商品图片"
              />
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ product.name }}</h3>
              <div class="product-price">¥{{ product.price }}</div>
              <div class="product-meta">
                <span class="product-category">{{
                  product.category_name
                }}</span>
                <span class="product-stock">库存: {{ product.stock }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "SearchContentView",
  data() {
    return {
      searchKeyword: "",
      products: [],
      categories: [],
      loading: false,
      currentPage: 1,
      pageSize: 12,
      total: 0,
      sortBy: "default",
      selectedCategory: null,
      priceRange: null,
      baseUrl: "http://localhost:8000"
    };
  },
  created() {
    // 获取URL中的搜索参数
    const query = this.$route.query;
    if (query.keyword) {
      this.searchKeyword = query.keyword;
    }

    // 获取分类列表
    this.fetchCategories();

    // 加载商品
    this.fetchProducts();
  },
  methods: {
    onSearch(value) {
      this.searchKeyword = value;
      this.currentPage = 1; // 重置页码
      this.fetchProducts();

      // 更新URL
      this.$router.push({
        path: "/index/search",
        query: { keyword: value }
      });
    },

    onCategoryChange(value) {
      this.selectedCategory = value;
      this.currentPage = 1; // 重置页码
      this.fetchProducts();
    },

    onPriceRangeChange(value) {
      this.priceRange = value;
      this.currentPage = 1; // 重置页码
      this.fetchProducts();
    },

    onSortChange() {
      this.currentPage = 1; // 重置页码
      this.fetchProducts();
    },

    onPageChange(page) {
      this.currentPage = page;
      this.fetchProducts();
    },

    onPageSizeChange(current, size) {
      this.pageSize = size;
      this.currentPage = 1; // 重置页码
      this.fetchProducts();
    },

    handleProductClick(product) {
      // 跳转到商品详情页
      let route = this.$router.resolve({
        name: "detail",
        query: { id: product.id }
      });
      window.open(route.href, "_blank");
    },

    fetchCategories() {
      axios
        .get(`${this.baseUrl}/api/categories/`)
        .then(response => {
          const categories = response.data.results || response.data;
          this.categories = categories.map(category => ({
            id: category.id,
            title: category.name
          }));
        })
        .catch(error => {
          console.error("获取分类失败:", error);
        });
    },

    fetchProducts() {
      this.loading = true;

      // 构建查询参数
      const params = {
        page: this.currentPage,
        page_size: this.pageSize
      };

      // 关键词搜索
      if (this.searchKeyword) {
        params.search = this.searchKeyword;
      }

      // 分类筛选
      if (this.selectedCategory) {
        params.category = this.selectedCategory;
      }

      // 排序
      if (this.sortBy && this.sortBy !== "default") {
        params.ordering = this.sortBy;
      }

      // 价格范围筛选
      if (this.priceRange) {
        const [min, max] = this.priceRange.split("-");
        if (min) params.price_min = min;
        if (max) params.price_max = max;
      }

      axios
        .get(`${this.baseUrl}/api/products/`, { params })
        .then(response => {
          // 处理分页数据
          const isPagedResponse = response.data.results !== undefined;
          const products = isPagedResponse
            ? response.data.results
            : response.data;
          this.total = isPagedResponse ? response.data.count : products.length;

          // 转换商品数据格式
          this.products = products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            image_url: product.image_url,
            category_id: product.category,
            category_name: product.category_name || "未分类"
          }));
        })
        .catch(error => {
          console.error("搜索商品失败:", error);
          this.$message.error("搜索失败，请稍后重试");
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }
};
</script>

<style scoped lang="less">
.search-container {
  padding: 20px 0;
  max-width: 1200px;
  margin: 0 auto;

  .search-header {
    margin-bottom: 20px;

    .search-bar {
      margin-bottom: 16px;
    }

    .search-filters {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
  }

  .search-results {
    min-height: 400px;

    .no-results {
      text-align: center;
      padding: 60px 0;
      color: #999;
      font-size: 16px;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;

      .product-card {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        cursor: pointer;

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .product-image {
          height: 200px;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            transition: transform 0.3s ease;
          }
        }

        .product-info {
          padding: 15px;

          .product-name {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .product-price {
            font-size: 18px;
            font-weight: bold;
            color: #ff6b00;
            margin-bottom: 8px;
          }

          .product-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #999;

            .product-category {
              background-color: #f5f5f5;
              padding: 2px 6px;
              border-radius: 4px;
            }
          }
        }
      }
    }
  }

  .pagination {
    margin-top: 30px;
    text-align: center;
  }
}

@media (max-width: 992px) {
  .search-results .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .search-results .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .search-results .product-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}
</style>
