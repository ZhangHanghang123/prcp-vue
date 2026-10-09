<template>
  <div class="reverse-page" v-loading="loading">
    <!-- 顶部克制白底 hero：图标 + 标题 + 状态 + 操作（无渐变） -->
    <div class="hero-header">
      <div class="hero-content">
        <div class="hero-icon-wrap">
          <i class="el-icon-data-analysis"></i>
        </div>
        <div class="hero-main">
          <div class="hero-title-row">
            <h1 class="hero-title">测算方案 · 结果驾驶舱</h1>
            <el-tag class="hero-badge" effect="plain" size="small">PRD v3 · 总览视图</el-tag>
          </div>
          <div class="hero-sub-row">
            <span class="hero-meta"><i class="el-icon-document"></i> 默认方案：2026 · 中信银行 · 24 月反算</span>
            <span class="hero-meta-divider">|</span>
            <span class="hero-meta"><i class="el-icon-time"></i> 数据日期：2027-12-01</span>
            <span class="hero-meta-divider">|</span>
            <span class="hero-meta"><i class="el-icon-refresh"></i> 最近刷新：刚刚</span>
          </div>
        </div>
        <div class="hero-actions">
          <el-button size="small" icon="el-icon-refresh" @click="load">刷新数据</el-button>
          <el-button size="small" type="primary" icon="el-icon-download" @click="exportTrend">导出快照</el-button>
        </div>
      </div>
    </div>

    <!-- 筛选条：grid 布局保证一行 -->
    <div class="filter-bar">
      <div class="filter-grid">
        <div class="filter-cell">
          <label class="filter-label">组合方案</label>
          <el-select v-model="filter.reverseSchemeId" placeholder="请选择" clearable size="small" class="filter-control">
            <el-option v-for="o in filterOptions.reverseSchemes" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
        <div class="filter-cell">
          <label class="filter-label">运行记录</label>
          <el-select v-model="filter.runId" placeholder="请选择" clearable size="small" class="filter-control">
            <el-option v-for="o in filterOptions.reverseRuns" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
        <div class="filter-cell">
          <label class="filter-label">预测月份</label>
          <el-select v-model="filter.predictMonth" placeholder="请选择" clearable size="small" class="filter-control">
            <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </div>
        <div class="filter-cell">
          <label class="filter-label">数据日期</label>
          <el-date-picker v-model="filter.dataDate" type="month" value-format="yyyy-MM"
                          placeholder="选择月份" size="small" class="filter-control" />
        </div>
        <div class="filter-cell">
          <label class="filter-label">账户册方案</label>
          <el-select v-model="filter.schemeId" placeholder="请选择" clearable size="small" class="filter-control">
            <el-option v-for="o in filterOptions.coaSchemes" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
        <div class="filter-cell filter-cell-narrow">
          <label class="filter-label">预测期</label>
          <div class="filter-num-wrap">
            <el-input-number v-model="filter.predictMonths" :min="1" :max="60" size="small" controls-position="right" class="filter-num" />
            <span class="hint">月</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 9 个 KPI 卡片（3 行 x 3-4 列） -->
    <div class="kpi-grid">
      <div v-for="(k, i) in kpis" :key="i" class="kpi-card">
        <div class="kpi-label">{{ k.label }}</div>
        <div class="kpi-value-wrap">
          <i v-if="k.trend === 'up'" class="trend-icon trend-up">↑</i>
          <i v-else-if="k.trend === 'down'" class="trend-icon trend-down">↓</i>
          <i v-else-if="k.trend === 'flat'" class="trend-icon trend-flat">→</i>
          <span class="kpi-value" :style="{ color: k.color }">{{ formatKpi(k) }}</span>
          <span v-if="k.total" class="kpi-suffix">{{ k.suffix || '/'+k.total }}</span>
          <span v-else-if="k.unit" class="kpi-unit">{{ k.unit }}</span>
        </div>
        <div v-if="k.total" class="kpi-progress-bar" :style="{ '--c': k.color }">
          <div class="bar-fill" :style="{ width: Math.min(100, (Number(k.value)/k.total)*100) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 下方双栏：折线图 + 大类分布 -->
    <div class="bottom-row">
      <el-card shadow="never" class="trend-card">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-time"></i> 5 指标 24 月趋势</span>
          <el-button type="text" size="mini" icon="el-icon-download" @click="exportTrend">导出</el-button>
        </div>
        <v-chart v-if="!loading && trendOption" :options="trendOption" :autoresize="true" class="full-chart" />
      </el-card>

      <el-card shadow="never" class="dist-card">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-pie-chart"></i> 大类分布</span>
        </div>
        <v-chart v-if="!loading && donutOption" :options="donutOption" :autoresize="true" class="dist-half" />
        <v-chart v-if="!loading && barOption" :options="barOption" :autoresize="true" class="dist-half" />
      </el-card>
    </div>

    <!-- 节点 × 指标 热力图（按 category 分组水平柱图） -->
    <div class="bottom-row heatmap-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-data-line"></i> 节点 × 指标 热力图</span>
          <div class="heatmap-controls">
            <el-select v-model="heatmapMetric" size="mini" style="width:160px" @change="renderHeatmap">
              <el-option v-for="m in heatmapMetricOptions" :key="m.code" :label="m.label" :value="m.code" />
            </el-select>
            <el-select v-model="heatmapCategory" size="mini" clearable placeholder="全部类别" style="width:130px" @change="renderHeatmap">
              <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
            <el-input v-model="heatmapKw" size="mini" clearable placeholder="按节点编码/名称过滤" style="width:180px" @input="renderHeatmap" />
          </div>
        </div>
        <div ref="heatmapChart" class="heatmap-area"></div>
      </el-card>
    </div>

    <!-- Top 10 节点 + 风险预警（双栏） -->
    <div class="bottom-row twocol-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-trophy"></i> Top 10 节点（按余额绝对值）</span>
        </div>
        <el-table :data="topNodes" size="mini" stripe border max-height="320">
          <el-table-column type="index" width="42" />
          <el-table-column prop="node_code" label="编码" width="120" />
          <el-table-column prop="node_name" label="名称" min-width="180" show-overflow-tooltip />
          <el-table-column label="类别" width="90">
            <template slot-scope="s">
              <el-tag size="mini" :type="catTagType(s.row.category)" effect="plain">{{ catLabel(s.row.category) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="current_balance" label="余额（万）" width="130" align="right">
            <template slot-scope="s">{{ fmtNum(s.row.current_balance) }}</template>
          </el-table-column>
          <el-table-column prop="weighted_rate" label="利率%" width="90" align="right">
            <template slot-scope="s">{{ fmtNumPct(s.row.weighted_rate) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-warning-outline"></i> 风险预警（{{ alerts.length }}）</span>
        </div>
        <div v-if="alerts.length === 0" class="empty-alert">
          <i class="el-icon-success"></i> 所有节点指标在阈值范围内 ✅
        </div>
        <el-table v-else :data="alerts" size="mini" stripe border max-height="320">
          <el-table-column prop="node_code" label="编码" width="100" />
          <el-table-column prop="node_name" label="名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="类别" width="80">
            <template slot-scope="s">
              <el-tag size="mini" :type="catTagType(s.row.category)" effect="plain">{{ catLabel(s.row.category) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="余额" width="100" align="right">
            <template slot-scope="s">{{ fmtNum(s.row.current_balance) }}</template>
          </el-table-column>
          <el-table-column label="预警" min-width="160">
            <template slot-scope="s">
              <el-tag size="mini" :type="s.row.severity === 'critical' ? 'danger' : 'warning'" effect="dark">
                {{ s.row.alert_type }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script>
import { dashboardApi } from '@/api/dashboard'
import VChart from 'vue-echarts'
import * as echarts from 'echarts'
import { COLOR_PRIMARY, PALETTE_AUX, CATEGORY_COLORS, AXIS_COLORS, WARNING_LINE_STYLE, BASELINE_LINE_STYLE } from '@/utils/chartTheme'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/pie'
import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/heatmap'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/title'
import 'echarts/lib/component/markLine'
import 'echarts/lib/component/visualMap'
import 'echarts/lib/component/dataZoom'

export default {
  name: 'ReverseDashboard',
  components: { VChart },
  data() {
    return {
      loading: false,
      filter: {
        reverseSchemeId: null,
        runId: null,
        predictMonth: '2027-12-01',
        dataDate: '2027-12',
        schemeId: 8,            // 默认中信银行账户册 2026
        predictMonths: 24
      },
      filterOptions: { reverseSchemes: [], reverseRuns: [], coaSchemes: [] },
      kpis: [],
      trend: { dates: [], series: [] },
      donut: [],
      bar: [],
      nodeMatrix: [],
      topNodes: [],
      alerts: [],
      heatmapChart: null,
      heatmapMetric: 'CURRENT_BALANCE',
      heatmapCategory: '',
      heatmapKw: '',
      dataDate: '',
      monthOptions: []
    }
  },
  computed: {
    trendOption() {
      // 双 Y 轴：4 个 % 指标走左轴，△EVE 走右轴（亿）
      const series = (this.trend.series || []).map(s => {
        const isDeve = s.code === 'KPI_PNN_DEVE'
        // △EVE 数据按万元，要除以 10000 转为亿
        const data = isDeve ? s.data.map(v => v == null ? null : Number((v / 10000).toFixed(2))) : s.data
        return {
          name: s.name + (isDeve ? ' (亿)' : ' (%)'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          yAxisIndex: isDeve ? 1 : 0,
          lineStyle: { width: 2 },
          itemStyle: { color: s.color },
          data: data
        }
      })
      return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: {
          data: series.map(s => s.name),
          top: 0, right: 0, textStyle: { fontSize: 11 },
          itemWidth: 14, itemHeight: 8
        },
        grid: { left: 50, right: 50, top: 40, bottom: 60 },
        xAxis: {
          type: 'category',
          data: this.trend.dates,
          axisLabel: { fontSize: 10, rotate: 30, formatter: (v) => (v || '').slice(2).replace('-', '') }
        },
        yAxis: [
          { type: 'value', name: '%',  position: 'left',  axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: 'dashed' } } },
          { type: 'value', name: '亿', position: 'right', axisLabel: { fontSize: 11 }, splitLine: { show: false } }
        ],
        series: series
      }
    },
    donutOption() {
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
          data: (this.donut || []).map(d => ({
            name: d.name, value: d.amount, itemStyle: { color: d.color }
          }))
        }]
      }
    },
    // 节点热力图：按指标 + 类别筛选
    heatmapMetricOptions() {
      return [
        { code: 'CURRENT_BALANCE', label: '当前余额（万）' },
        { code: 'AVG_BALANCE',     label: '平均余额（万）' },
        { code: 'WEIGHTED_RATE',   label: '加权利率（%）' },
        { code: 'INTEREST_AMOUNT', label: '利息收支（万）' }
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
    barOption() {
      return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}<br/>${p[0].value} 个节点` },
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: (this.donut || []).map(d => d.name), axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [{
          name: '节点数',
          type: 'bar',
          barWidth: '55%',
          data: (this.donut || []).map(d => ({
            value: d.cnt || 0,
            itemStyle: { color: d.color }
          })),
          label: { show: true, position: 'top', fontSize: 11 }
        }]
      }
    }
  },
  async mounted() {
    // 生成月份选项（最近 36 个月）
    const opts = []
    const now = new Date('2027-12-01')
    for (let i = 0; i < 36; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    }
    this.monthOptions = opts
    await this.load()
    this.$nextTick(() => { this.renderHeatmap() })
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.heatmapChart) this.heatmapChart.dispose()
  },
  methods: {
    onResize() {
      if (this.heatmapChart) this.heatmapChart.resize()
    },
    async load() {
      this.loading = true
      try {
        const res = await dashboardApi.reverseOverview({
          data_date: this.filter.predictMonth,
          scheme_id: this.filter.schemeId
        })
        const d = res || {}
        this.kpis = d.kpis || []
        this.trend = d.trend || { dates: [], series: [] }
        this.donut = (d.distribution || {}).donut || []
        this.bar = (d.distribution || {}).bar || []
        this.nodeMatrix = d.nodeMatrix || []
        this.topNodes = d.topNodes || []
        this.alerts = d.riskAlerts || []
        this.dataDate = d.dataDate || ''
        this.filterOptions = d.filterOptions || { reverseSchemes: [], reverseRuns: [], coaSchemes: [] }
        this.$nextTick(() => { this.renderHeatmap() })
      } finally {
        this.loading = false
      }
    },
    formatKpi(k) {
      if (k == null) return '-'
      const v = k.value
      if (v == null) return '-'
      if (typeof v === 'number') {
        // 整数不补零
        if (Number.isInteger(v)) return v.toLocaleString('zh-CN')
        return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return v
    },
    fmtNum(v) {
      if (v == null) return '-'
      const n = Number(v)
      if (Number.isInteger(n)) return n.toLocaleString('zh-CN')
      return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    fmtNumPct(v) {
      if (v == null) return '-'
      const n = Number(v)
      // 加权利率是 0~1 小数（如 0.035 = 3.5%）
      const pct = Math.abs(n) <= 1 ? n * 100 : n
      return pct.toFixed(2)
    },
    catLabel(c) {
      return ({ ASSET: '资产', LIABILITY: '负债', EQUITY: '权益', OFF_BALANCE: '表外', OTHER: '其他' })[c] || (c || '-')
    },
    catTagType(c) {
      return ({ ASSET: 'success', LIABILITY: 'warning', EQUITY: 'info', OFF_BALANCE: '', OTHER: 'danger' })[c] || ''
    },
    renderHeatmap() {
      if (!this.$refs.heatmapChart) return
      if (!this.heatmapChart) this.heatmapChart = echarts.init(this.$refs.heatmapChart)
      const allRows = this.nodeMatrix || []
      // 过滤：按 category + 关键词
      let rows = allRows
      if (this.heatmapCategory) rows = rows.filter(r => r.category === this.heatmapCategory)
      if (this.heatmapKw) {
        const kw = this.heatmapKw.toLowerCase()
        rows = rows.filter(r => (r.node_code || '').toLowerCase().includes(kw) || (r.node_name || '').toLowerCase().includes(kw))
      }
      // 按 metric 取值
      const metricKey = ({
        CURRENT_BALANCE: 'current_balance',
        AVG_BALANCE:     'avg_balance',
        WEIGHTED_RATE:   'weighted_rate',
        INTEREST_AMOUNT: 'interest_amount'
      })[this.heatmapMetric] || 'current_balance'

      // 取绝对值最大的前 50 个节点（柱图太长影响可读性）
      rows = rows.slice().sort((a, b) => Math.abs(Number(b[metricKey]) - Number(a[metricKey]))).slice(0, 50)

      // 类目 y 轴（按 category 排序）
      const catOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'OFF_BALANCE', 'OTHER']
      const sortedRows = rows.slice().sort((a, b) => {
        const ca = catOrder.indexOf(a.category); const cb = catOrder.indexOf(b.category)
        if (ca !== cb) return ca - cb
        return Math.abs(Number(b[metricKey])) - Math.abs(Number(a[metricKey]))
      })

      const yLabels = sortedRows.map(r => r.node_code || `N${r.node_id}`)
      const yFull   = sortedRows.map(r => `${r.node_code} · ${r.node_name}`)
      const values  = sortedRows.map(r => Number(r[metricKey]) || 0)
      const cats    = sortedRows.map(r => r.category)

      // 类目颜色
      const catColor = CATEGORY_COLORS

      this.heatmapChart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            const p = params[0]
            const i = p.dataIndex
            const r = sortedRows[i]
            return `<b>${yFull[i]}</b><br/>类别：${this.catLabel(r.category)}<br/>层级：L${r.level}<br/>${this.heatmapMetricOptions.find(o => o.code === this.heatmapMetric).label}：<b>${this.fmtNum(values[i])}</b>`
          }
        },
        grid: { left: 110, right: 30, top: 20, bottom: 30 },
        xAxis: {
          type: 'value',
          axisLabel: { fontSize: 10, formatter: (v) => Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + '亿' : v.toFixed(0) },
          splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
        },
        yAxis: {
          type: 'category',
          data: yLabels,
          axisLabel: { fontSize: 10, color: (val, idx) => catColor[cats[idx]] || '#666', formatter: (v) => v.length > 14 ? v.slice(0, 13) + '…' : v },
          inverse: true
        },
        series: [{
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: catColor[cats[i]] || '#999' } })),
          barWidth: '60%',
          label: { show: true, position: 'right', fontSize: 10, formatter: (p) => Math.abs(p.value) >= 1 ? p.value.toFixed(0) : '' }
        }]
      }, true)
    },
    exportTrend() {
      this.$message.info('导出功能开发中…')
    }
  }
}
</script>

<style scoped>
.reverse-page {
  background: var(--bg-page);
  min-height: 100vh;
  padding-bottom: 24px;
}

/* ===== Hero Header（克制金融风格：白底 + 蓝图标 + 细边框） ===== */
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

/* ===== 筛选条（grid 一行） ===== */
.filter-bar {
  background: #fff;
  padding: 14px 20px;
  margin: 14px 16px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
}
.filter-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.filter-cell-narrow { max-width: 140px; }
.filter-label {
  font-size: 12px; color: #666; font-weight: 500; padding-left: 2px;
}
.filter-control { width: 100% !important; }
.filter-num-wrap { display: flex; align-items: center; gap: 4px; }
.filter-num { width: 90px; flex: 1; }
.hint { color: #999; font-size: 12px; }

/* 适配小屏（< 1200px）：自动换行 */
@media (max-width: 1200px) {
  .filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero-content { flex-wrap: wrap; }
}

/* ===== KPI 卡片网格 ===== */
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
  justify-content: center;
  transition: box-shadow .2s;
}
.kpi-card:hover { box-shadow: var(--shadow-hover); }
.kpi-label { color: var(--text-muted); font-size: 13px; margin-bottom: 6px; }
.kpi-value-wrap { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.kpi-value { font-size: 26px; font-weight: 600; line-height: 1.1; color: var(--text-title); }
/* 数据强调色（KPI 卡片数值本身用蓝色而不是黑色，强化信息感）*/
.kpi-card .kpi-value { color: var(--brand-primary); }
.kpi-unit { color: var(--text-muted); font-size: 13px; margin-left: 2px; }
.kpi-suffix { color: var(--text-muted); font-size: 14px; font-weight: 500; }
.trend-icon { font-size: 14px; margin-right: 2px; }
/* 上升/下降箭头用箭头符号表达，不依赖红绿色盲友好 */
.trend-up   { color: var(--brand-primary); }
.trend-down { color: var(--action-primary); }
.trend-flat { color: var(--text-muted); }
.kpi-progress-bar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: rgba(11, 111, 242, 0.08); border-radius: 0 0 8px 8px; overflow: hidden;
}
.bar-fill {
  height: 100%; background: var(--brand-primary); transition: width .4s;
}

/* ===== Bottom Row 双栏 ===== */
.bottom-row {
  margin: 0 16px 12px;
  display: grid;
  grid-template-columns: 5fr 3fr;
  gap: 12px;
}
.heatmap-row { grid-template-columns: 1fr; margin-bottom: 12px; }
.twocol-row { grid-template-columns: 1fr 1fr; }
.heatmap-controls { display: flex; gap: 8px; align-items: center; }
.heatmap-area { width: 100%; height: 360px; }
.empty-alert {
  padding: 36px;
  text-align: center;
  color: #67c23a;
  font-size: 14px;
}
.empty-alert i { font-size: 24px; margin-right: 8px; }
.trend-card, .dist-card {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}
.trend-card >>> .el-card__body,
.dist-card >>> .el-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
}
.full-chart {
  width: 100%;
  flex: 1;
  min-height: 360px;
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
</style>