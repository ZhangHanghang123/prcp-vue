<template>
  <div class="v-chart">
    <div ref="chartRef" class="v-chart-canvas"></div>
  </div>
</template>

<script>
/**
 * @file VChart — ECharts 图表容器组件 (Vue 2 + ElementUI 版)
 *
 * @desc
 * 为什么不用官方 `vue-echarts@4`:
 *   该包内部 `import echarts from 'echarts/lib/echarts'`, 而 ECharts 5 的
 *   `echarts/lib/echarts.js` 默认导出是一个**残缺对象** (只有 init, 没有 use /
 *   registerTheme / graphic 等), 且其按需引入的 chart 模块与完整版 echarts 走的是
 *   两套 API —— 结果是 <v-chart> 渲染出 canvas 但内容全空 (无坐标轴/无折线)。
 *   本组件改用**完整版 echarts** (`import * as echarts from 'echarts'`) 直接驱动,
 *   与项目内其它手工 `echarts.init()` 的图表 (雷达图/余额图) 行为一致。
 *
 * @props {Object} options      ECharts option
 * @props {Boolean} autoresize  容器尺寸变化时自动 resize (默认 true)
 *
 * @example
 *   <VChart :options="chartOption" class="my-chart" />
 */
import * as echarts from 'echarts'

export default {
  name: 'VChart',
  props: {
    /** ECharts 配置项 */
    options: { type: Object, default: null },
    /** 容器尺寸变化时自动重绘 */
    autoresize: { type: Boolean, default: true }
  },
  data() {
    return {
      chart: null,
      resizeObserver: null,
      lastOptions: null
    }
  },
  watch: {
    options: {
      deep: true,
      handler(val) {
        this.render(val)
      }
    }
  },
  mounted() {
    this.initChart()
    this.render(this.options)
    if (this.autoresize) this.observeResize()
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    /**
     * <p>创建 ECharts 实例</p>
     *
     * @returns {void}
     */
    initChart() {
      if (this.chart) return
      if (!this.$refs.chartRef) return
      this.chart = echarts.init(this.$refs.chartRef)
    },
    /**
     * <p>渲染 / 更新图表</p>
     *
     * @param {Object} opt ECharts option
     * @returns {void}
     */
    render(opt) {
      if (!opt) return
      this.initChart()
      if (!this.chart) return
      this.lastOptions = opt
      // notMerge=true: 数据点数变化时 (如月份切换) 避免残留旧 series
      this.chart.setOption(opt, true)
    },
    /**
     * <p>监听容器尺寸变化 → 自动 resize</p>
     *
     * @returns {void}
     */
    observeResize() {
      if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', this.handleResize)
        return
      }
      this.resizeObserver = new ResizeObserver(() => {
        if (this.chart) this.chart.resize()
      })
      this.resizeObserver.observe(this.$refs.chartRef)
    },
    /**
     * <p>window resize 兜底 (浏览器不支持 ResizeObserver 时)</p>
     *
     * @returns {void}
     */
    handleResize() {
      if (this.chart) this.chart.resize()
    }
  }
}
</script>

<style scoped>
/* 外层继承调用方的尺寸 (如 .full-chart 的 flex:1 + min-height:320px) */
.v-chart {
  width: 100%;
  height: 100%;
  min-height: inherit;
  position: relative;
}
/* 内层绝对定位撑满外层, 避免 height:100% 在父级 height:auto 时塌成 0 */
.v-chart-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
