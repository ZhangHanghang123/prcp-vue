<template>
  <div class="dashboard-panels" v-loading="loading">
    <!-- 顶部克制白底 hero -->
    <div class="hero-header">
      <div class="hero-content">
        <div class="hero-icon-wrap">
          <i class="el-icon-data-analysis"></i>
        </div>
        <div class="hero-main">
          <div class="hero-title-row">
            <h1 class="hero-title">测算方案 · 结果驾驶舱</h1>
            <el-tag class="hero-badge" effect="plain" size="small" v-if="snapshot.scheme_name">
              {{ snapshot.scheme_code }} · {{ snapshot.run_id ? 'Run#' + snapshot.run_id : '' }} · M{{ snapshot.date_offset || 1 }}
            </el-tag>
          </div>
          <div class="hero-sub-row">
            <span class="hero-meta"><i class="el-icon-document"></i> {{ snapshot.scheme_name || '未选方案' }}</span>
            <span class="hero-meta-divider">|</span>
            <span class="hero-meta"><i class="el-icon-collection"></i> 账户册：{{ snapshot.coa_scheme_code }} {{ snapshot.coa_scheme_name }}</span>
            <span class="hero-meta-divider">|</span>
            <span class="hero-meta"><i class="el-icon-time"></i> 数据日期：{{ snapshot.data_date }}</span>
            <span class="hero-meta-divider">|</span>
            <span class="hero-meta"><i class="el-icon-refresh"></i> 基期：{{ snapshot.base_data_date }} · 预测期：{{ snapshot.horizon_months }} 月</span>
          </div>
        </div>
        <div class="hero-actions">
          <el-button size="small" icon="el-icon-refresh" @click="loadSnapshot">刷新数据</el-button>
          <el-button size="small" type="primary" icon="el-icon-download" @click="exportSnapshot">导出快照</el-button>
        </div>
      </div>
    </div>

    <!-- 筛选条 -->
    <div class="filter-bar">
      <div class="filter-grid">
        <div class="filter-cell">
          <label class="filter-label">组合方案</label>
          <el-select v-model="filter.schemeCode" placeholder="请选择" size="small" class="filter-control" @change="onSchemeChange">
            <el-option v-for="s in options.schemes || []" :key="s.scheme_code"
                       :label="`${s.scheme_code} - ${s.scheme_name}`" :value="s.scheme_code" />
          </el-select>
        </div>
        <div class="filter-cell">
          <label class="filter-label">运行记录</label>
          <el-select v-model="filter.runId" placeholder="请选择" size="small" class="filter-control" @change="onRunChange">
            <el-option v-for="r in runs" :key="r.run_id"
                       :label="`#${r.run_id} (${r.status})`" :value="r.run_id" />
          </el-select>
        </div>
        <div class="filter-cell">
          <label class="filter-label">预测月份</label>
          <el-select v-model="filter.dateOffset" placeholder="请选择" size="small" class="filter-control" @change="onDateChange">
            <el-option v-for="d in dates" :key="d.date_offset"
                       :label="`M${d.date_offset} (${d.data_date})`" :value="d.date_offset" />
          </el-select>
        </div>
        <div class="filter-cell filter-cell-tag" v-if="snapshot.run_id">
          <label class="filter-label">运行摘要</label>
          <div class="filter-tags">
            <el-tag size="mini" effect="plain" type="info">运行状态：{{ snapshot.run_status || '-' }}</el-tag>
            <el-tag size="mini" effect="plain" type="info">总节点：{{ kpi.total_nodes || 0 }}</el-tag>
            <el-tag size="mini" effect="plain" type="info">含指标：{{ kpi.with_metrics || 0 }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 1: 8 KPI 卡（4 列 × 2 行） -->
    <div class="kpi-grid">
      <!-- 资产余额 -->
      <div class="kpi-card kpi-asset">
        <div class="kpi-label"><i class="el-icon-bank-card"></i> 资产余额</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ fmtMoney(kpi.asset_total) }}</span>
          <span class="kpi-unit">元</span>
        </div>
      </div>
      <!-- 负债余额 -->
      <div class="kpi-card kpi-liability">
        <div class="kpi-label"><i class="el-icon-takeaway-box"></i> 负债余额</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ fmtMoney(kpi.liability_total) }}</span>
          <span class="kpi-unit">元</span>
        </div>
      </div>
      <!-- 贷款加权平均利率 -->
      <div class="kpi-card kpi-loan-rate">
        <div class="kpi-label"><i class="el-icon-money"></i> 贷款加权平均利率</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(kpi.loan_weighted_rate, 4) }}</span>
        </div>
        <div class="kpi-sub">境内各项人民币贷款下 5 个 L4 子节点按余额加权</div>
      </div>
      <!-- ROE 净资产收益率 -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-data-line"></i> ROE 净资产收益率</div>
        <div class="kpi-value-wrap">
          <i v-if="metricTrend('ROE')==='down'" class="trend-icon trend-down">↓</i>
          <i v-else-if="metricTrend('ROE')==='up'" class="trend-icon trend-up">↑</i>
          <span class="kpi-value">{{ pctOrDash(metricAvg('ROE')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.ROE?.min || 11 }}%</div>
      </div>
      <!-- CET1 -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-medal"></i> CET1 核心一级</div>
        <div class="kpi-value-wrap">
          <i v-if="metricTrend('CET1')==='down'" class="trend-icon trend-down">↓</i>
          <i v-else-if="metricTrend('CET1')==='up'" class="trend-icon trend-up">↑</i>
          <span class="kpi-value">{{ pctOrDash(metricAvg('CET1')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.CET1?.min || 8.5 }}%</div>
      </div>
      <!-- LCR -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-tickets"></i> LCR 流动性覆盖率</div>
        <div class="kpi-value-wrap">
          <i v-if="metricTrend('LCR')==='down'" class="trend-icon trend-down">↓</i>
          <i v-else-if="metricTrend('LCR')==='up'" class="trend-icon trend-up">↑</i>
          <span class="kpi-value">{{ pctOrDash(metricAvg('LCR')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.LCR?.min || 100 }}%</div>
      </div>
      <!-- NSFR -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-files"></i> NSFR 净稳定资金</div>
        <div class="kpi-value-wrap">
          <i v-if="metricTrend('NSFR')==='down'" class="trend-icon trend-down">↓</i>
          <i v-else-if="metricTrend('NSFR')==='up'" class="trend-icon trend-up">↑</i>
          <span class="kpi-value">{{ pctOrDash(metricAvg('NSFR')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.NSFR?.min || 100 }}%</div>
      </div>
      <!-- △EVE -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-warning-outline"></i> △EVE 利率风险</div>
        <div class="kpi-value-wrap">
          <i v-if="Math.abs(Number(kpi.metric_avg?.DELTA_EVE || 0)) > 1.2 * (thresholds.DELTA_EVE?.max_abs || 5)" class="trend-icon trend-down">↑</i>
          <span class="kpi-value">{{ fmtMoneyEve(kpi.metric_avg?.DELTA_EVE) }}</span>
          <span class="kpi-unit">亿</span>
        </div>
        <div class="kpi-sub">阈值 |x| ≤ {{ thresholds.DELTA_EVE?.max_abs || 5 }} 亿</div>
      </div>
    </div>

    <!-- Row 2: 5 指标 24 月趋势 + 5 指标评分雷达（左右两列） -->
    <div class="bottom-row">
      <el-card shadow="never" class="trend-card">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-time"></i> 5 指标 24 月趋势</span>
          <el-button type="text" size="mini" icon="el-icon-download" @click="exportTrend">导出</el-button>
        </div>
        <v-chart v-if="!loading && trendOption" :options="trendOption" :autoresize="true" class="full-chart" />
      </el-card>

      <el-card shadow="never" class="radar-card">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-pie-chart"></i> 5 指标评分雷达</span>
        </div>
        <div ref="radarChart" class="radar-area-large"></div>
      </el-card>
    </div>

    <!-- Row 3: Top 10 节点（按当前余额绝对值）+ 大类分布（左右两列） -->
    <div class="bottom-row twocol-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-trophy"></i> Top 10 节点（按当前余额绝对值）</span>
        </div>
        <el-table :data="topNodes" size="mini" stripe border max-height="320">
          <el-table-column label="节点" min-width="180" show-overflow-tooltip prop="node_name" />
          <el-table-column label="当前余额（元）" width="150" align="right">
            <template #default="{ row }">{{ fmtMoney(row.current_balance) }}</template>
          </el-table-column>
          <el-table-column label="平均利率%" width="100" align="right">
            <template #default="{ row }">{{ pctOrDash(row.weighted_rate, 2) }}</template>
          </el-table-column>
          <el-table-column label="月均余额（元）" width="150" align="right">
            <template #default="{ row }">{{ fmtMoney(row.avg_balance) }}</template>
          </el-table-column>
          <el-table-column label="利息收支（元）" width="150" align="right">
            <template #default="{ row }">{{ fmtMoney(row.interest_amount) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never" class="dist-card">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-pie-chart"></i> 大类分布</span>
        </div>
        <v-chart v-if="!loading && donutOption" :options="donutOption" :autoresize="true" class="dist-half" />
        <v-chart v-if="!loading && barOption" :options="barOption" :autoresize="true" class="dist-half" />
      </el-card>
    </div>

    <!-- Row 4: 节点 × 指标 热力图（真热力图，全宽） -->
    <div class="bottom-row heatmap-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-data-line"></i> 节点 × 指标 热力图</span>
          <div class="heatmap-controls">
            <el-select v-model="heatmapMetric" size="mini" style="width:160px" @change="renderHeatmap">
              <el-option v-for="m in heatmapMetricOptions" :key="m.code" :label="m.label" :value="m.code" />
            </el-select>
            <el-select v-model="heatmapCategory" size="mini" clearable placeholder="按大类过滤" style="width:130px" @change="renderHeatmap">
              <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </div>
        </div>
        <div ref="heatmapChart" class="heatmap-area"></div>
      </el-card>
    </div>
  </div>
</template>

<script>
import VChart from 'vue-echarts'
import * as echarts from 'echarts'
import { COLOR_PRIMARY, PALETTE_AUX, CATEGORY_COLORS, AXIS_COLORS, WARNING_LINE_STYLE, BASELINE_LINE_STYLE } from '@/utils/chartTheme'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/pie'
import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/heatmap'
import 'echarts/lib/chart/radar'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/title'
import 'echarts/lib/component/markLine'
import 'echarts/lib/component/visualMap'

// 调用 PRCP-Java 后端 /reverse-dashboard 4 端点
async function rqOptions() { return (await fetch('/prcp-java/api/reverse-dashboard/options', { headers: tokenH() })).json() }
async function rqRuns(sc) { return (await fetch('/prcp-java/api/reverse-dashboard/runs?scheme_code=' + encodeURIComponent(sc), { headers: tokenH() })).json() }
async function rqDates(sc, rid) { return (await fetch('/prcp-java/api/reverse-dashboard/dates?scheme_code=' + encodeURIComponent(sc) + '&run_id=' + rid, { headers: tokenH() })).json() }
async function rqSnapshot(p) {
  const qs = new URLSearchParams(p).toString()
  return (await fetch('/prcp-java/api/reverse-dashboard/snapshot?' + qs, { headers: tokenH() })).json()
}
function tokenH() {
  const t = localStorage.getItem('prcp-java-token')
  return t ? { Authorization: 'Bearer ' + t } : {}
}

export default {
  name: 'ReverseDashboardPanels',
  components: { VChart },
  data() {
    return {
      loading: false,
      options: { schemes: [], default: {} },
      runs: [],
      dates: [],
      snapshot: {},
      filter: { schemeCode: null, runId: null, dateOffset: 1 },
      heatmapMetric: 'current_balance',
      heatmapCategory: '',
      radarChart: null,
      heatmapChart: null,
      _rerenderTimer: null
    }
  },
  computed: {
    kpi() { return this.snapshot.kpi || {} },
    thresholds() { return this.snapshot.thresholds || {} },
    topNodes() { return this.snapshot.top_nodes || [] },
    riskAlerts() { return this.snapshot.risk_alerts || [] },
    nodeMatrix() { return this.snapshot.node_matrix || [] },
    heatmapMetricOptions() {
      return [
        { code: 'current_balance',  label: '当前余额（元）' },
        { code: 'avg_balance',      label: '平均余额（元）' },
        { code: 'weighted_rate',    label: '加权平均利率' },
        { code: 'interest_amount',  label: '利息收支（元）' }
      ]
    },
    categoryOptions() {
      return [
        { value: 'ASSET',       label: '资产' },
        { value: 'LIABILITY',   label: '负债' },
        { value: 'EQUITY',      label: '权益' },
        { value: 'OFF_BALANCE', label: '表外' },
        { value: 'OTHER',       label: '其他' }
      ]
    },
    trendOption() {
      const t = this.snapshot.trend || {}
      const months = t.months || []
      const metricSeries = [
        { key: 'ROE',        color: '#722ed1', label: 'ROE' },
        { key: 'CET1',       color: '#1890ff', label: 'CET1' },
        { key: 'LCR',        color: '#52c41a', label: 'LCR' },
        { key: 'NSFR',       color: '#13c2c2', label: 'NSFR' },
        { key: 'DELTA_EVE',  color: '#eb2f96', label: '△EVE' }
      ]
      const series = metricSeries.map(s => ({
        name: s.label,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        itemStyle: { color: s.color },
        data: t[s.key] || []
      }))
      return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: metricSeries.map(s => s.label), top: 0, right: 0, textStyle: { fontSize: 11 } },
        grid: { left: 50, right: 30, top: 40, bottom: 30 },
        xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: [
          { type: 'value', name: '%', position: 'left', axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: 'dashed' } } },
          { type: 'value', name: '亿', position: 'right', axisLabel: { fontSize: 11 }, splitLine: { show: false } }
        ],
        series: series
      }
    },
    donutOption() {
      const d = (this.snapshot.category_distribution || {}).by_balance || {}
      const data = Object.entries(d).map(([k, v]) => ({ name: this.catLabel(k), value: v, _cat: k }))
      return {
        tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
        legend: { orient: 'vertical', right: 5, top: 'middle', textStyle: { fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
        series: [{
          name: '大类分布',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
          labelLine: { length: 8, length2: 6 },
          data: data.map(d => ({
            name: d.name, value: d.value,
            itemStyle: { color: CATEGORY_COLORS[d._cat] || '#999' }
          }))
        }]
      }
    },
    barOption() {
      const c = (this.snapshot.category_distribution || {}).by_count || {}
      const data = Object.entries(c).map(([k, v]) => ({ name: this.catLabel(k), value: v, _cat: k }))
      return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}<br/>${p[0].value} 个节点` },
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [{
          name: '节点数',
          type: 'bar',
          barWidth: '55%',
          data: data.map(d => ({
            value: d.value,
            itemStyle: { color: CATEGORY_COLORS[d._cat] || '#999' }
          })),
          label: { show: true, position: 'top', fontSize: 11 }
        }]
      }
    }
  },
  watch: {
    // 父组件切换 activeTab 时，v-if 重新创建组件，mounted 自动加载
    // 这里只监听数据变化重新渲染图表
    'snapshot'() {
      this.renderAll()
    }
  },
  async mounted() {
    await this.loadOptions()
    await this.loadSnapshot()
    this.$nextTick(() => {
      this.renderRadar()
      this.renderHeatmap()
    })
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.radarChart) this.radarChart.dispose()
    if (this.heatmapChart) this.heatmapChart.dispose()
  },
  methods: {
    onResize() {
      if (this.radarChart) this.radarChart.resize()
      if (this.heatmapChart) this.heatmapChart.resize()
    },
    renderAll() {
      this.$nextTick(() => {
        this.renderRadar()
        this.renderHeatmap()
      })
    },
    async loadOptions() {
      try {
        const r = await rqOptions()
        if (r.code === 0) {
          this.options = r.data || { schemes: [], default: {} }
          const def = this.options.default || {}
          this.filter.schemeCode = def.scheme_code || (this.options.schemes[0]?.scheme_code)
          this.filter.runId = def.run_id
          this.filter.dateOffset = def.date_offset || 1
          if (this.filter.schemeCode) await this.loadRuns()
        }
      } catch (e) { console.warn('options failed', e) }
    },
    async loadRuns() {
      if (!this.filter.schemeCode) { this.runs = []; return }
      try {
        const r = await rqRuns(this.filter.schemeCode)
        if (r.code === 0) {
          this.runs = (r.data && r.data.items) || []
          if (!this.filter.runId && this.runs.length) this.filter.runId = this.runs[0].run_id
        }
      } catch (e) { console.warn('runs failed', e) }
      await this.loadDates()
    },
    async loadDates() {
      if (!this.filter.schemeCode || !this.filter.runId) { this.dates = []; return }
      try {
        const r = await rqDates(this.filter.schemeCode, this.filter.runId)
        if (r.code === 0) {
          this.dates = (r.data && r.data.items) || []
          if (!this.dates.find(d => d.date_offset === this.filter.dateOffset)) {
            this.filter.dateOffset = this.dates[0]?.date_offset || 1
          }
        }
      } catch (e) { console.warn('dates failed', e) }
    },
    async loadSnapshot() {
      if (!this.filter.schemeCode) return
      this.loading = true
      try {
        const r = await rqSnapshot({
          scheme_code: this.filter.schemeCode,
          run_id: this.filter.runId || undefined,
          date_offset: this.filter.dateOffset || undefined
        })
        if (r.code === 0 && r.data) {
          this.snapshot = r.data
          this.renderAll()
        }
      } catch (e) { console.warn('snapshot failed', e) }
      finally { this.loading = false }
    },
    onSchemeChange() { this.loadRuns().then(() => this.loadSnapshot()) },
    onRunChange() { this.loadDates().then(() => this.loadSnapshot()) },
    onDateChange() { this.loadSnapshot() },

    metricAvg(k) {
      const m = this.kpi.metric_avg || {}
      return m[k]
    },
    metricTrend(k) {
      const v = Number(this.metricAvg(k))
      if (isNaN(v) || v === null) return 'flat'
      const thr = this.thresholds[k]
      if (!thr) return 'flat'
      if (thr.direction === 'down') {
        return v >= (thr.min || 0) ? 'up' : 'down'
      }
      return 'flat'
    },
    fmtMoney(v) {
      if (v == null) return '-'
      const a = Math.abs(Number(v))
      if (a >= 1e8) return (v / 1e8).toFixed(2) + ' 亿'
      if (a >= 1e4) return (v / 1e4).toFixed(2) + ' 万'
      return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    },
    fmtMoneyEve(v) {
      if (v == null) return '-'
      return Number(v).toFixed(2)
    },
    pctOrDash(v, digits = 2) {
      if (v == null) return '-'
      const n = Number(v)
      if (isNaN(n)) return '-'
      return n.toFixed(digits) + '%'
    },
    catLabel(c) {
      return ({ ASSET: '资产', LIABILITY: '负债', EQUITY: '权益', OFF_BALANCE: '表外', OTHER: '其他' })[c] || (c || '-')
    },
    catTagType(c) {
      return ({ ASSET: 'success', LIABILITY: 'warning', EQUITY: 'info', OFF_BALANCE: '', OTHER: 'danger' })[c] || ''
    },

    renderRadar() {
      if (!this.$refs.radarChart) return
      if (!this.radarChart) this.radarChart = echarts.init(this.$refs.radarChart)
      const scores = this.snapshot.kpi_scores || []
      // 取 5 个 REG_* 指标的 score（0-100）
      const labels = ['ROE', 'CET1', 'LCR', 'NSFR', '△EVE']
      const values = labels.map(k => {
        const s = scores.find(x => (x && x.kpi_code || '').endsWith(k.replace('△EVE', 'DELTA_EVE')))
        return s && s.score != null ? s.score : 0
      })
      this.radarChart.setOption({
        tooltip: { trigger: 'item' },
        radar: {
          indicator: labels.map(k => ({ name: k, max: 100 })),
          shape: 'polygon',
          radius: '60%',
          center: ['50%', '52%'],
          splitNumber: 4,
          axisName: { color: '#25334B', fontSize: 11 },
          splitArea: { areaStyle: { color: ['rgba(11, 111, 242, 0.04)', 'rgba(11, 111, 242, 0.08)'] } },
          splitLine: { lineStyle: { color: '#D9E5F7' } }
        },
        series: [{
          type: 'radar',
          data: [{
            value: values,
            name: '监管指标评分',
            areaStyle: { color: 'rgba(91, 143, 249, 0.35)' },
            lineStyle: { color: '#5B8FF9', width: 2 },
            itemStyle: { color: '#5B8FF9' }
          }]
        }]
      }, true)
    },

    renderHeatmap() {
      if (!this.$refs.heatmapChart) return
      if (!this.heatmapChart) this.heatmapChart = echarts.init(this.$refs.heatmapChart)
      const allRows = this.nodeMatrix || []
      let rows = allRows
      if (this.heatmapCategory) rows = rows.filter(r => r.category === this.heatmapCategory)
      // 取 abs top 50
      rows = rows.slice().sort((a, b) => Math.abs(Number(b[this.heatmapMetric] || 0)) - Math.abs(Number(a[this.heatmapMetric] || 0))).slice(0, 50)
      const xLabels = rows.map(r => r.node_name || r.node_code)
      const yLabels = ['资产', '负债', '权益', '表外', '其他']
      const yIdx = (c) => ({ ASSET: 0, LIABILITY: 1, EQUITY: 2, OFF_BALANCE: 3, OTHER: 4 })[c] || 4
      const data = []
      rows.forEach((r, x) => {
        const v = Number(r[this.heatmapMetric] || 0)
        data.push([x, yIdx(r.category), v])
      })
      // 计算 min/max
      const vals = data.map(d => d[2])
      const min = vals.length ? Math.min(...vals) : 0
      const max = vals.length ? Math.max(...vals) : 1
      this.heatmapChart.setOption({
        tooltip: {
          position: 'top',
          formatter: (p) => {
            const r = rows[p.dataIndex]
            return `<b>${r.node_name}</b><br/>编码：${r.node_code}<br/>类别：${this.catLabel(r.category)}<br/>层级：L${r.node_level}<br/>${this.heatmapMetricOptions.find(o => o.code === this.heatmapMetric).label}：<b>${this.fmtMoney(r[this.heatmapMetric])}</b>`
          }
        },
        grid: { left: 80, right: 30, top: 30, bottom: 60 },
        xAxis: {
          type: 'category',
          data: xLabels,
          splitArea: { show: true },
          axisLabel: { fontSize: 10, rotate: 50, interval: 0, formatter: (v) => v.length > 6 ? v.slice(0, 5) + '…' : v }
        },
        yAxis: {
          type: 'category',
          data: yLabels,
          splitArea: { show: true },
          axisLabel: { fontSize: 11 }
        },
        visualMap: {
          min: min, max: max,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          textStyle: { fontSize: 10 },
          inRange: { color: ['#61DDAA', '#5B8FF9', '#F6903D', '#C9332B'] }
        },
        series: [{
          name: this.heatmapMetricOptions.find(o => o.code === this.heatmapMetric).label,
          type: 'heatmap',
          data: data,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
        }]
      }, true)
    },

    exportSnapshot() { this.$message.info('导出快照功能开发中…') },
    exportTrend() { this.$message.info('导出趋势功能开发中…') }
  }
}
</script>

<style scoped>
.dashboard-panels {
  padding-bottom: 8px;
}

/* ===== Hero ===== */
.hero-header {
  background: var(--bg-card);
  color: var(--text-body);
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color-2);
  margin: 0 0 14px;
  box-shadow: var(--shadow-card);
}
.hero-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hero-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 8px;
  background: var(--brand-primary-pale);
  border: 1px solid var(--brand-primary-light);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.hero-icon-wrap i { font-size: 22px; color: var(--brand-primary); }
.hero-main { flex: 1; min-width: 0; }
.hero-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hero-title {
  margin: 0; font-size: 20px; font-weight: 600; line-height: 1.3;
  color: var(--text-title);
}
.hero-badge {
  background: var(--brand-primary-pale) !important;
  border: 1px solid var(--brand-primary-light) !important;
  color: var(--brand-primary) !important;
  font-weight: 500;
}
.hero-sub-row {
  display: flex; align-items: center; gap: 6px; margin-top: 6px;
  font-size: 12px; color: var(--text-muted); flex-wrap: wrap;
}
.hero-meta { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.hero-meta i { font-size: 12px; }
.hero-meta-divider { color: var(--border-color); margin: 0 4px; }
.hero-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

/* ===== Filter ===== */
.filter-bar {
  background: #fff;
  padding: 14px 20px;
  margin: 14px 16px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 14px;
  align-items: end;
}
.filter-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.filter-cell-tag { align-self: end; }
.filter-label {
  font-size: 12px; color: #6C7D96; font-weight: 500; padding-left: 2px;
}
.filter-control { width: 100% !important; }
.filter-tags { display: flex; gap: 6px; flex-wrap: wrap; }

@media (max-width: 1200px) {
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ===== KPI Grid ===== */
.kpi-grid {
  margin: 0 16px 14px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi-card {
  background: var(--bg-card);
  border-radius: var(--radius-card);
  border: 1px solid var(--border-color-2);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
  position: relative;
  min-height: 92px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition: box-shadow .2s;
}
.kpi-card:hover { box-shadow: var(--shadow-hover); }
.kpi-card.kpi-asset { border-top: 3px solid #1890ff; }
.kpi-card.kpi-liability { border-top: 3px solid #fa8c16; }
.kpi-card.kpi-loan-rate { border-top: 3px solid #fa541c; }
.kpi-label { color: #6C7D96; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
.kpi-value-wrap { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.kpi-value { font-size: 26px; font-weight: 600; line-height: 1.1; color: #071B4D; }
.kpi-unit { color: #6C7D96; font-size: 13px; }
.kpi-sub { color: #6C7D96; font-size: 11px; margin-top: 4px; }
.trend-icon { font-size: 14px; margin-right: 2px; }
.trend-up { color: #0B6FF2; }
.trend-down { color: #C9332B; }
.radar-area { width: 100%; height: 200px; }
.radar-area-large { width: 100%; height: 340px; }

/* ===== Bottom Row ===== */
.bottom-row {
  margin: 0 16px 12px;
  display: grid;
  grid-template-columns: 5fr 3fr;
  gap: 12px;
}
.heatmap-row { grid-template-columns: 1fr; margin-bottom: 12px; }
.twocol-row { grid-template-columns: 1fr 1fr; }
.heatmap-controls { display: flex; gap: 8px; align-items: center; }
.heatmap-area { width: 100%; height: 380px; }
.trend-card, .dist-card, .radar-card {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}
.trend-card >>> .el-card__body,
.dist-card >>> .el-card__body,
.radar-card >>> .el-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
}
.full-chart {
  width: 100%;
  flex: 1;
  min-height: 320px;
}
.dist-half {
  width: 100%;
  flex: 1;
  min-height: 0;
}
.dist-half:first-of-type {
  flex: 1 1 55%;
}
.dist-half:last-of-type {
  flex: 1 1 45%;
}
.trend-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 500;
}

/* 小屏适配 */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .bottom-row { grid-template-columns: 1fr; }
  .twocol-row { grid-template-columns: 1fr; }
}
</style>