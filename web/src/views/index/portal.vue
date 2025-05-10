<template>
  <div class="portal">
    <Header />
    <Content />
    <Footer />
  </div>
</template>

<script>
import Header from "@/views/index/components/header";
import Footer from "@/views/index/components/footer";
import Content from "@/views/index/components/content";

export default {
  components: {
    Footer,
    Header,
    Content
  }
};
</script>

<style scoped lang="less">
/* 生鲜主题色彩变量 */
@primary-color: #4caf50; /* 新鲜草绿色 */
@heading-color: #2e7d32; /* 深叶绿色 */
@text-color: #33691e; /* 橄榄绿文本 */
@border-color: #aed581; /* 嫩芽绿边框 */
@background-light: #f9fbf6; /* 清新背景色 */
@accent-color: #ff8f00; /* 成熟橙色 */
@error-color: #e53935; /* 鲜草莓红 */

/* 主要内容样式 */

.portal {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: @background-light;
  position: relative;
  overflow-x: hidden;

  /* 添加自然元素装饰 */
  &::before {
    content: "";
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 300px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M42,-52.3C55.9,-39.9,69.7,-28.2,75.6,-12.9C81.6,2.4,79.6,21.2,70.2,34.5C60.9,47.8,44.2,55.4,27.1,61.7C10,68,-7.5,72.8,-23.6,69.2C-39.7,65.6,-54.4,53.5,-65.8,37.8C-77.1,22,-85.2,2.7,-81.9,-14.5C-78.5,-31.6,-63.8,-46.5,-47.5,-58.7C-31.2,-70.9,-13.3,-80.4,0.9,-81.5C15.1,-82.7,28.1,-64.7,42,-52.3Z" fill="%234caf5022" transform="translate(100 100)" /></svg>');
    background-repeat: no-repeat;
    background-size: contain;
    opacity: 0.1;
    z-index: -1;
    animation: float 30s ease-in-out infinite alternate;
  }

  &::after {
    content: "";
    position: fixed;
    bottom: 0;
    left: 0;
    width: 250px;
    height: 250px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M47.7,-58.4C61.3,-44.7,71.4,-29.1,74.2,-12.2C77,4.7,72.6,23,63.1,38.4C53.7,53.9,39.1,66.6,22.3,72.5C5.5,78.5,-13.4,77.8,-30.1,70.7C-46.8,63.7,-61.3,50.4,-70.6,33.6C-79.9,16.7,-84.1,-3.7,-79.2,-22.1C-74.3,-40.5,-60.4,-57,-44.1,-70.1C-27.7,-83.2,-8.9,-93,6.9,-101.4C22.7,-109.8,45.5,-116.9,52.2,-105.5C59,-94,65.7,-63.9,47.7,-58.4Z" fill="%23ff8f0022" transform="translate(100 100)" /></svg>');
    background-repeat: no-repeat;
    background-size: contain;
    opacity: 0.1;
    z-index: -1;
    animation: float 40s ease-in-out infinite alternate-reverse;
  }
}

/* 有机动态效果 */
@keyframes float {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  100% {
    transform: translate(10px, 10px) rotate(5deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .portal {
    &::before,
    &::after {
      opacity: 0.05;
    }
  }
}

/* 全局动画过渡效果 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}
.page-enter,
.page-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background-color: rgba(174, 213, 129, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, @primary-color, @heading-color);
  border-radius: 4px;
  transition: all 0.3s;
}

::-webkit-scrollbar-thumb:hover {
  background: @accent-color;
}
</style>
