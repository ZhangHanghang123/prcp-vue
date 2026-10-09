<template>
  <div class="rdash-page" v-loading="loading">
    <!-- 顶部筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" size="small">
        <el-form-item label="组合方案">
          <el-select v-model="filters.scheme_code" filterable style="width:240px" @change="onSchemeChange">
            <el-option v-for="s in options.schemes || []" :key="s.scheme_code"
                       :label="`${s.scheme_code} - ${s.scheme_name}`" :value="s.scheme_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="Run">
          <el-select v-model="filters.run_id" style="width:160px" @change="loadSnapshot">
            <el-option v-for="r in runItems" :key="r.run_id"
                       :label="`#${r.run_id} (${r.status})`" :value="r.run_id">
              <span style="float:left">#{{ r.run_id }}</span>
              <el-tag size="mini" :type="r.status==='SUCCESS'?'success':'danger'" style="float:right;margin-top:3px">{{ r.status }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="月份">
          <el-select v-model="filters.date_offset" style="width:120px" @change="loadSnapshot">
            <el-option v-for="d in dateItems" :key="d.date_offset"
                       :label="`M${d.date_offset} (${d.data_date})`" :value="d.date_offset" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-refresh" @click="loadSnapshot">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 4 个 KPI 卡 -->
    <el-row :gutter="12" class="kpi-row">
      <el-col :span="6">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">总节点数 / 有指标</div>
          <div class="kpi-value">{{ kpi.total_nodes || 0 }} <span class="kpi-sub">/ {{ kpi.with_metrics || 0 }}</span></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="kpi-card asset">
          <div class="kpi-label">资产总额 (¥)</div>
          <div class="kpi-value">{{ fmtMoney(kpi.asset_total) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="kpi-card liab">
          <div class="kpi-label">负债总额 (¥)</div>
          <div class="kpi-value">{{ fmtMoney(kpi.liability_total) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="kpi-card equity">
          <div class="kpi-label">权益总额 (¥)</div>
          <div class="kpi-value">{{ fmtMoney(kpi.equity_total) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 5 指标卡 -->
    <el-row :gutter="12" class="kpi-row">
      <el-col :span="4" v-for="m in metricTypes" :key="m">
        <el-card shadow="never" class="kpi-card mini" :body-style="{padding:'8px 12px'}">
          <div class="kpi-label">{{ m }}</div>
          <div class="kpi-value small">
            <el-tag size="mini" :type="metricStatusType(m, kpi.metric_avg && kpi.metric_avg[m])">
              {{ fmtNum(kpi.metric_avg && kpi.metric_avg[m]) }}
            </el-tag>
            <span class="metric-sub">avg</span>
          </div>
          <div class="metric-range">
            <span>min {{ fmtNum(kpi.metric_min && kpi.metric_min[m]) }}</span>
            <span>max {{ fmtNum(kpi.metric_max && kpi.metric_max[m]) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 + 大类分布 -->
    <el-row :gutter="12" class="chart-row">
      <el-col :span="16">
        <el-card shadow="never">
          <div slot="header" class="chart-header">
            <span>📈 24 月 5 指标趋势</span>
            <span class="muted">{{ dataDate }} | 共 {{ trend.months.length }} 月</span>
          </div>
          <div ref="trendChart" class="chart-area"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <div slot="header" class="chart-header">
            <span>📊 大类分布</span>
          </div>
          <div ref="catChart" class="chart-area"></div>
        </el-card>
      </el-col>
    </el-row>

      </div>
</template>

<script>
import * as echarts from 'echarts'
import { reverseDashboardApi } from '@/api/reverse-dashboard'

/**
 * @file 反算仪表盘 (独立页)
 * @desc 反算结果独立仪表盘, 4 个区域:
 *         1) 筛选条 (组合方案 / Run / 月份)
 *         2) 4 个 KPI 卡 (总节点/资产/负债/权益)
 *         3) 5 指标 min/max/avg 卡 (ROE/CET1/LCR/NSFR/DELTA_EVE)
 *         4) 双栏: 24 月 5 指标趋势 (折线) + 大类分布 (饼图)
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET  /reverse-dashboard/options                          - 方案 + 默认 run/月
 *   GET  /reverse-dashboard/runs?scheme_code=                - run 列表
 *   GET  /reverse-dashboard/dates?scheme_code=&run_id=       - 月份列表
 *   GET  /reverse-dashboard/snapshot?scheme_code=&run_id=&date_offset= - 全量快照
 *
 * 关联组件: 无
 * 关联路由: /reverse-dashboard (group: 反算仪表盘)
 */
export default {
  name: 'ReverseDashboard',
  data() {
    return {
      loading: false,
      loadingMatrix: false,
      options: {},
      filters: { scheme_code: '', run_id: null, date_offset: 1 },
      runItems: [],
      dateItems: [],
      snapshot: null,
      metricTypes: ['ROE', 'CET1', 'LCR', 'NSFR', 'DELTA_EVE'],
      thresholds: {},
      trendChart: null,
      catChart: null
    }
  },
  computed: {
    kpi() { return this.snapshot ? this.snapshot.kpi : {} },
    trend() { return this.snapshot ? this.snapshot.trend : { months: [] } },
    categoryDist() { return this.snapshot ? this.snapshot.category_distribution : { by_count: {}, by_balance: {} } },
    dataDate() { return this.snapshot ? this.snapshot.data_date : '' }
  },
  watch: {
    snapshot() {
      this.$nextTick(() => { this.renderCharts() })
    }
  },
  mounted() {
    this.loadOptions()
  },
  beforeDestroy() {
    if (this.trendChart) this.trendChart.dispose()
    if (this.catChart) this.catChart.dispose()
  },
  methods: {
    /**
     * <p>金额格式化 (zh-CN 千分位 + 最多 2 位小数)</p>
     *
     * @param {number} v 金额
     * @returns {string} 格式化字符串
     */
    fmtMoney(v) {
      if (v == null) return '-'
      const n = Number(v)
      return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    },
    /**
     * <p>数值格式化 (整数不补零, 其他保 p 位小数)</p>
     *
     * @param {number} v 数值
     * @param {number} [p] 小数位数 (传了就用 toFixed)
     * @returns {string} 格式化字符串
     */
    fmtNum(v, p) {
      if (v == null) return '-'
      const n = Number(v)
      if (p != null) return n.toFixed(p)
      return Number.isInteger(n) ? n.toString() : n.toFixed(2)
    },
    /**
     * <p>大类 key → Element UI tag 类型</p>
     *
     * @param {string} c 大类 key
     * @returns {string} tag 类型
     */
    catType(c) {
      return { ASSET: 'success', LIABILITY: 'warning', EQUITY: 'info', OFF_BALANCE: '' }[c] || ''
    },
    /**
     * <p>根据阈值判断指标状态 (success/warning/danger/info)</p>
     *
     * @param {string} m 指标 key (ROE/CET1/LCR/NSFR/DELTA_EVE)
     * @param {number} v 当前值
     * @returns {string} tag 类型
     */
    metricStatusType(m, v) {
      if (v == null) return 'info'
      const n = Number(v)
      const thr = this.thresholds[m]
      if (!thr) return 'info'
      if (thr.min !== undefined && n < thr.min) return n < thr.min * 0.9 ? 'danger' : 'warning'
      if (thr.max_abs !== undefined && Math.abs(n) > thr.max_abs) return Math.abs(n) > thr.max_abs * 1.2 ? 'danger' : 'warning'
      return 'success'
    },
    /** 加载方案/Run/月 默认值, 并自动触发 loadSnapshot */
    async loadOptions() {
      try {
        const r = await reverseDashboardApi.options()
        this.options = r.data || r
        const def = this.options.default || {}
        if (def.scheme_code) this.filters.scheme_code = def.scheme_code
        await this.loadRuns()
        if (def.run_id) this.filters.run_id = def.run_id
        await this.loadDates()
        if (def.date_offset) this.filters.date_offset = def.date_offset
        this.loadSnapshot()
      } catch (e) {
        this.$message.error('加载选项失败：' + (e.message || ''))
      }
    },
    /** 加载当前方案的 run 列表 */
    async loadRuns() {
      try {
        const r = await reverseDashboardApi.runs(this.filters.scheme_code)
        this.runItems = (r.data && r.data.items) || r.items || []
        if (this.runItems.length > 0 && this.filters.run_id == null) {
          this.filters.run_id = this.runItems[0].run_id
        }
      } catch (e) { this.runItems = [] }
    },
    /** 加载当前 run 的月份列表 */
    async loadDates() {
      try {
        const r = await reverseDashboardApi.dates(this.filters.scheme_code, this.filters.run_id)
        this.dateItems = (r.data && r.data.items) || r.items || []
      } catch (e) { this.dateItems = [] }
    },
    /** 方案切换 — 重置 run_id + date_offset, 重新加载 */
    async onSchemeChange() {
      this.filters.run_id = null
      this.filters.date_offset = 1
      await this.loadRuns()
      if (this.filters.run_id) await this.loadDates()
      this.loadSnapshot()
    },
    /** 加载全量快照 */
    async loadSnapshot() {
      this.loading = true
      try {
        const r = await reverseDashboardApi.snapshot(this.filters)
        this.snapshot = r.data || r
        this.thresholds = this.snapshot.thresholds || {}
      } catch (e) {
        this.$message.error('加载快照失败：' + ((e.response && e.response.data && e.response.data.msg) || e.message))
        this.snapshot = null
      } finally { this.loading = false }
    },
    /** 重渲染两个图表 */
    renderCharts() {
      this.renderTrendChart()
      this.renderCategoryChart()
    },
    /** 渲染 24 月 5 指标趋势折线图 */
    renderTrendChart() {
      if (!this.trend || !this.trend.months || this.trend.months.length === 0) return
      if (!this.trendChart) this.trendChart = echarts.init(this.$refs.trendChart)
      const colors = { ROE: '#67c23a', CET1: '#409eff', LCR: '#e6a23c', NSFR: '#9b59b6', DELTA_EVE: '#f56c6c' }
      const series = this.metricTypes.map(m => ({
        name: m, type: 'line', smooth: true,
        data: this.trend[m] || [],
        itemStyle: { color: colors[m] },
        connectNulls: true
      }))
      this.trendChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        grid: { top: 40, left: 50, right: 30, bottom: 40 },
        xAxis: { type: 'category', data: this.trend.months, axisLabel: { rotate: 45, fontSize: 10 } },
        yAxis: { type: 'value' },
        series
      })
    },
    /** 渲染大类分布环形饼图 */
    renderCategoryChart() {
      if (!this.categoryDist || !this.categoryDist.by_balance) return
      if (!this.catChart) this.catChart = echarts.init(this.$refs.catChart)
      const dist = this.categoryDist.by_balance
      const data = Object.entries(dist).filter(([k, v]) => v !== 0).map(([k, v]) => ({ name: k, value: v }))
      this.catChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true,
          data,
          label: { formatter: '{b}\n{d}%' },
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        }]
      })
    }
  }
}
</script>

<style scoped>
.rdash-page { padding: 12px; }
.filter-card { margin-bottom: 12px; }
.kpi-row { margin-bottom: 12px; }
.chart-row { margin-bottom: 12px; }
.kpi-card { padding: 4px 0; }
.kpi-label { font-size: 12px; color: #909399; }
.kpi-value { font-size: 24px; font-weight: bold; margin-top: 4px; }
.kpi-value.small { font-size: 18px; }
.kpi-sub { font-size: 12px; color: #909399; font-weight: normal; }
.kpi-card.asset .kpi-value { color: #67c23a; }
.kpi-card.liab .kpi-value { color: #e6a23c; }
.kpi-card.equity .kpi-value { color: #409eff; }
.metric-sub { font-size: 10px; color: #909399; margin-left: 4px; }
.metric-range { font-size: 11px; color: #909399; display: flex; justify-content: space-between; margin-top: 4px; }
.chart-area { width: 100%; min-height: 340px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; }
.chart-header .muted { font-size: 12px; color: #909399; }
.matrix-card { margin-top: 12px; }
.empty-alert { padding: 40px; text-align: center; color: #67c23a; font-size: 14px; }
.empty-alert i { font-size: 24px; margin-right: 8px; }
.alert-msg { font-size: 11px; color: #606266; margin-left: 4px; }
</style>