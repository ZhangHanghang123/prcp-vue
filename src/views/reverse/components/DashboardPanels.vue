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
          <el-button size="small" type="primary" icon="el-icon-download"
                     :loading="exporting" @click="exportResult">导出结果</el-button>
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
        <div class="filter-cell">
          <label class="filter-label">余额口径</label>
          <el-select v-model="balanceMode" placeholder="请选择" size="small" class="filter-control" @change="onBalanceModeChange">
            <el-option label="基准日当前余额" value="base" />
            <el-option label="当月预测余额" value="forecast" />
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

    <!-- Row 0.5: 目标达成进度（对齐原系统 ReverseDashboard.tsx 区块 3） -->
    <el-card v-if="targets.length" shadow="never" class="target-card">
      <div slot="header" class="trend-header">
        <span><i class="el-icon-aim"></i> 目标达成进度</span>
        <span class="target-hint">当前期 vs 方案目标　|　右侧为 M12（12 个月后）完成率</span>
      </div>
      <div class="target-head">
        <span class="tc-name">指标</span>
        <span class="tc-target">目标</span>
        <span class="tc-actual">实际</span>
        <span class="tc-progress">达成进度</span>
        <span class="tc-rate">当前完成率</span>
        <span class="tc-m12">M12 完成率</span>
      </div>
      <div v-for="t in targets" :key="t.kpi_code + (t.target_name || '')" class="target-row">
        <span class="target-name tc-name" :style="{ color: metricColor(t.metric_type) }">
          {{ metricLabel(t.metric_type) || t.kpi_code }}
        </span>
        <span class="target-val tc-target">
          {{ constraintSymbol(t.constraint_type) }}{{ formatTargetValue(t.target_value, t.metric_type) }}
        </span>
        <span class="target-actual tc-actual" :style="{ color: metricColor(t.metric_type) }">
          {{ formatTargetValue(t.current_value, t.metric_type) }}
        </span>
        <span class="target-progress tc-progress">
          <el-progress :percentage="progressPct(t.current_rate)"
                       :stroke-width="10"
                       :show-text="false"
                       :color="progressColor(t)"
                       :format="() => ''" />
        </span>
        <span class="target-rate tc-rate" :class="rateClass(t)">
          完成率 {{ t.current_rate == null ? '-' : Number(t.current_rate).toFixed(2) + '%' }}
        </span>
        <span class="target-rate tc-m12" :class="rateClass(t, 'm12')">
          M12 {{ t.m12_rate == null ? '-' : Number(t.m12_rate).toFixed(2) + '%' }}
        </span>
      </div>
    </el-card>

    <!-- Row 1: 8 KPI 卡（4 列 × 2 行） -->
    <div class="kpi-grid">
      <!-- 资产余额 -->
      <div class="kpi-card kpi-asset">
        <div class="kpi-label"><i class="el-icon-bank-card"></i> 资产余额</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ fmtMoney(kpi.asset_total) }}</span>
        </div>
        <div class="kpi-compare"><kpi-compare kind="amount" :current="kpi.asset_total" :base="kpiBase.asset_total" direction="none" /></div>
      </div>
      <!-- 负债余额 -->
      <div class="kpi-card kpi-liability">
        <div class="kpi-label"><i class="el-icon-takeaway-box"></i> 负债余额</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ fmtMoney(kpi.liability_total) }}</span>
        </div>
        <div class="kpi-compare"><kpi-compare kind="amount" :current="kpi.liability_total" :base="kpiBase.liability_total" direction="none" /></div>
      </div>
      <!-- 贷款加权平均利率 -->
      <div class="kpi-card kpi-loan-rate">
        <div class="kpi-label"><i class="el-icon-money"></i> 贷款加权平均利率</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(loanRatePct(kpi.loan_weighted_rate), 2) }}</span>
        </div>
        <div class="kpi-sub">境内各项人民币贷款下 5 个 L4 子节点按余额加权</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="loanRatePct(kpi.loan_weighted_rate)" :base="loanRatePct(kpiBase.loan_weighted_rate)" direction="lower" :is-ratio-raw="true" /></div>
      </div>
      <!-- ROE 净资产收益率 -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-data-line"></i> ROE 净资产收益率
          <span :class="thresholdStatusCls(thresholdStatus('ROE', metricAvg('ROE')))">{{ thresholdStatus('ROE', metricAvg('ROE')) }}</span>
        </div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(metricAvg('ROE')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.ROE?.min || 11 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('ROE')" :base="kpiBase.metric_avg?.ROE" direction="higher" :is-ratio-raw="true" /></div>
      </div>
      <!-- CET1 -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-medal"></i> CET1 核心一级
          <span :class="thresholdStatusCls(thresholdStatus('CET1', metricAvg('CET1')))">{{ thresholdStatus('CET1', metricAvg('CET1')) }}</span>
        </div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(metricAvg('CET1')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.CET1?.min || 8.5 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('CET1')" :base="kpiBase.metric_avg?.CET1" direction="higher" :is-ratio-raw="true" /></div>
      </div>
      <!-- LCR -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-tickets"></i> LCR 流动性覆盖率
          <span :class="thresholdStatusCls(thresholdStatus('LCR', metricAvg('LCR')))">{{ thresholdStatus('LCR', metricAvg('LCR')) }}</span>
        </div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(metricAvg('LCR')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.LCR?.min || 100 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('LCR')" :base="kpiBase.metric_avg?.LCR" direction="higher" :is-ratio-raw="true" /></div>
      </div>
      <!-- NSFR -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-files"></i> NSFR 净稳定资金
          <span :class="thresholdStatusCls(thresholdStatus('NSFR', metricAvg('NSFR')))">{{ thresholdStatus('NSFR', metricAvg('NSFR')) }}</span>
        </div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(metricAvg('NSFR')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.NSFR?.min || 100 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('NSFR')" :base="kpiBase.metric_avg?.NSFR" direction="higher" :is-ratio-raw="true" /></div>
      </div>
      <!-- △EVE -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-warning-outline"></i> △EVE 利率风险
          <span :class="thresholdStatusCls(thresholdStatus('DELTA_EVE', metricAvg('DELTA_EVE')))">{{ thresholdStatus('DELTA_EVE', metricAvg('DELTA_EVE')) }}</span>
        </div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ fmtMoneyEve(kpi.metric_avg?.DELTA_EVE) }}</span>
          <span class="kpi-unit">亿</span>
        </div>
        <div class="kpi-sub">阈值 |x| ≤ {{ thresholds.DELTA_EVE?.max_abs || 5 }} 亿</div>
        <div class="kpi-compare"><kpi-compare kind="amount" :current="metricAvg('DELTA_EVE')" :base="kpiBase.metric_avg?.DELTA_EVE" direction="lower" :is-yi="true" /></div>
      </div>
    </div>

    <!-- Row 2: 5 指标 24 月趋势 + 5 指标评分雷达（左右两列） -->
    <div class="bottom-row">
      <el-card shadow="never" class="trend-card">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-time"></i> 5 指标 24 月趋势</span>
          <div class="trend-metric-picker">
            <label
              v-for="m in TREND_METRICS"
              :key="m.key"
              class="trend-metric-chip"
              :class="{ 'is-on': trendMetrics.includes(m.key) }"
              :style="trendMetrics.includes(m.key) ? { borderColor: m.color, color: m.color, background: m.color + '14' } : {}">
              <input
                type="checkbox"
                class="trend-metric-input"
                :checked="trendMetrics.includes(m.key)"
                @change="toggleTrendMetric(m.key, $event.target.checked)" />
              <i class="trend-metric-dot" :style="{ background: m.color }"></i>
              {{ m.label }}
            </label>
          </div>
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

    <!-- Row 3: 末级节点余额排行（全部末级节点, 按规模降序）+ 大类分布（左右两列） -->
    <div class="bottom-row twocol-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span>
            <i class="el-icon-trophy"></i> 末级节点余额排行
            <el-tag size="mini" effect="plain" type="info" style="margin-left:6px">
              全部账户册方案 · {{ leafNodesRanked.length }} 个末级节点
            </el-tag>
          </span>
        </div>
        <el-table :data="leafNodesRanked" size="mini" stripe border max-height="420"
                  :default-sort="{ prop: 'absBalance', order: 'descending' }">
          <el-table-column label="#" width="46" align="center">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="账户册方案" width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag size="mini" effect="plain" type="info">{{ row.coa_scheme_code || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="节点" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tooltip :content="row.node_code" placement="top">
                <span>{{ row.node_name || row.node_code }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="大类" width="70" align="center">
            <template #default="{ row }">
              <el-tag size="mini" effect="plain" :type="catTagType(row.category)">{{ catLabel(row.category) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前余额（元）" width="150" align="right">
            <template #default="{ row }">{{ fmtMoney(row.current_balance) }}</template>
          </el-table-column>
          <el-table-column label="平均利率%" width="90" align="right">
            <template #default="{ row }">{{ pctOrDash(loanRatePct(row.weighted_rate), 2) }}</template>
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
          <span>
            <i class="el-icon-pie-chart"></i>
            {{ balanceMode === 'base' ? '当前余额分布' : '预测余额分布' }}
          </span>
          <el-tag v-if="balanceMode === 'base' && catDist.balance_date" size="mini" effect="plain" type="info">
            基准日 {{ catDist.balance_date }}
          </el-tag>
          <el-tag v-else-if="catDist.forecast_date" size="mini" effect="plain" type="warning">
            预测月 {{ catDist.forecast_date }}
          </el-tag>
        </div>
        <div v-if="balanceMode === 'base'" class="dist-hint">
          ⓘ 基准日为方案起点，固定不变；切换上方「预测月份」时本图不变。需看随月份变化的余额，请把「余额口径」切到「当月预测余额」。
        </div>
        <v-chart v-if="!loading && donutOption" :options="donutOption" :autoresize="true" class="dist-donut" />
        <el-divider content-position="left" class="dist-divider">金额分布</el-divider>
        <v-chart v-if="!loading && barOption" :options="barOption" :autoresize="true" class="dist-bar" />
      </el-card>
    </div>

    <!-- Row 4: 末级节点余额柱状图（全宽，对齐原系统区块 7） -->
    <div class="bottom-row full-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-s-data"></i> 末级节点余额分布</span>
          <div class="balance-controls">
            <el-tag size="mini" effect="plain" type="info">
              {{ balanceMode === 'base' ? '基准日当前余额' : '当月预测余额' }}
            </el-tag>
            <el-select v-model="balanceFilterCat" size="mini" clearable placeholder="按大类过滤"
                       style="width:130px" @change="renderBalanceCharts">
              <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
            <el-tag size="mini" effect="plain" type="info">末级节点 {{ leafNodes.length }} 个</el-tag>
            <el-tag size="mini" effect="plain" type="info">
              {{ balanceMode === 'base' ? '基准日 ' + (catDist.balance_date || '-') : '预测月 ' + (catDist.forecast_date || '-') }}
            </el-tag>
          </div>
        </div>
        <div ref="balanceBarChart" class="balance-bar-area"></div>
      </el-card>
    </div>

    <!-- Row 5: 末级账户册余额走势（全宽，对齐原系统区块 8） -->
    <div class="bottom-row full-row">
      <el-card shadow="never">
        <div slot="header" class="trend-header">
          <span><i class="el-icon-data-line"></i> 末级账户册余额走势</span>
          <div class="balance-controls">
            <el-select v-model="balanceTrendView" size="mini" style="width:130px" @change="renderBalanceTrend">
              <el-option label="按大类汇总" value="category" />
              <el-option label="按节点明细" value="node" />
              <el-option label="单节点" value="single" />
            </el-select>
            <el-select v-if="balanceTrendView === 'node'" v-model="balanceTrendTopN" size="mini"
                       style="width:100px" @change="renderBalanceTrend">
              <el-option label="Top 5" :value="5" />
              <el-option label="Top 10" :value="10" />
              <el-option label="Top 15" :value="15" />
              <el-option label="Top 20" :value="20" />
              <el-option label="全部" value="all" />
            </el-select>
            <el-select v-if="balanceTrendView === 'single'" v-model="balanceTrendSingleCode"
                       size="mini" filterable placeholder="选择单个节点"
                       style="width:260px" @change="renderBalanceTrend">
              <el-option v-for="n in balanceTrendNodeOptions" :key="n.code"
                         :label="n.name + ' (' + n.code + ')'" :value="n.code" />
            </el-select>
            <el-tag size="mini" effect="plain" type="info">{{ balanceTrendMonths }} 个月</el-tag>
          </div>
        </div>
        <div ref="balanceTrendChart" class="balance-trend-area"></div>
      </el-card>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import VChart from '@/components/VChart.vue'
import { COLOR_PRIMARY, PALETTE_AUX, CATEGORY_COLORS, AXIS_COLORS, WARNING_LINE_STYLE, BASELINE_LINE_STYLE } from '@/utils/chartTheme'

/**
 * <p>趋势图指标元数据</p>
 *
 * <p>5 个指标量级差 100 倍 (LCR 148 vs ROE 12), 全开时 ROE/CET1 会被压成直线,
 * 因此默认只勾 ROE, 由用户在图头上切换。</p>
 *
 * <p>axis: 0 = 左轴 (%), 1 = 右轴 (亿) —— △EVE 单位是「亿」, 其余是「%」。</p>
 */
const TREND_METRICS = [
  { key: 'ROE',       color: '#722ed1', label: 'ROE',   axis: 0 },
  { key: 'CET1',      color: '#1890ff', label: 'CET1',  axis: 0 },
  { key: 'LCR',       color: '#52c41a', label: 'LCR',   axis: 0 },
  { key: 'NSFR',      color: '#13c2c2', label: 'NSFR',  axis: 0 },
  { key: 'DELTA_EVE', color: '#eb2f96', label: '△EVE',  axis: 1 }
]

/**
 * @file 反算驾驶舱面板 (reverse/Index.vue 的 Tab 3 子组件)
 * @desc 嵌入 reverse/Index.vue 的「测算结果」Tab, 5 区块布局:
 *         1) Hero + 筛选条 (组合方案/运行/月份/运行摘要 tag)
 *         2) 目标达成进度卡片 (目标/实际/进度条/当前完成率/M12 完成率)
 *         3) 8 KPI 卡 (4 列 × 2 行: 资产/负债/贷款加权利率/ROE/CET1/LCR/NSFR/△EVE, 含基期对比)
 *         4) 双栏: 5 指标 24 月趋势 + 5 指标评分雷达
 *         5) 双栏: 末级节点余额排行 (全部末级节点, 按规模降序) + 大类分布 (环形 + 柱图)
 *         6) 全宽: 末级节点余额分布 (横向条形 + 基准日/预测口径切换)
 *         7) 全宽: 末级账户册余额走势 (大类汇总 / 节点明细 TopN)
 *       直接调后端 /prcp-java/api/reverse-dashboard/{options,runs,dates,snapshot,balance-trend} 5 端点, 带 Bearer Token。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET /prcp-java/api/reverse-dashboard/options?                              - 方案列表 + 默认值
 *   GET /prcp-java/api/reverse-dashboard/runs?scheme_code=&                     - 运行列表
 *   GET /prcp-java/api/reverse-dashboard/dates?scheme_code=&run_id=            - 月份列表
 *   GET /prcp-java/api/reverse-dashboard/snapshot?scheme_code=&run_id=&date_offset= - 全量快照 (kpi/trend/top_nodes/risk_alerts/node_matrix/category_distribution/thresholds/kpi_scores)
 *
 * 关联组件: VChart (vue-echarts), echarts
 * 关联路由: /reverse (group: 反算分析, 作为 Tab 3)
 */

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

/**
 * <p>金额格式化 (模块级, 供函数式组件 KpiCompare 复用)</p>
 *
 * @param {number|string} v 金额 (元)
 * @returns {string} 带「亿 / 万」单位的文本
 */
function fmtMoneyVal(v) {
  if (v == null) return '-'
  const a = Math.abs(Number(v))
  if (a >= 1e8) return (v / 1e8).toFixed(2) + ' 亿'
  if (a >= 1e4) return (v / 1e4).toFixed(2) + ' 万'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/**
 * <p>KPI 卡「基期 vs 当前」对比标签 (函数式组件)</p>
 *
 * <p>为什么用函数式组件而不是返回 HTML 字符串 + v-html:
 * <ul>
 *   <li>返回 HTML 字符串时若用 {@code {{ }}} 插值, 标签会被当纯文本原样打印</li>
 *   <li>改用 v-html 又会因为 {@code <style scoped>} 不给动态插入节点加 scopeId, 样式全部失效</li>
 *   <li>函数式组件在父组件的 render 上下文中建 vnode, 继承父级 scopeId, 样式正常生效</li>
 * </ul>
 *
 * <p>kind='amount' → 变化率百分比 (如 +8.25%)；
 * kind='ratio' → 百分点差 (如 +1.25pp)，isRatioRaw 为 true 时输入已是百分数。</p>
 *
 * @author zhanghh
 * @since 2026-11-04
 */
const KpiCompare = {
  name: 'KpiCompare',
  functional: true,
  props: {
    kind: { type: String, default: 'amount' },
    current: { type: [Number, String], default: null },
    base: { type: [Number, String], default: null },
    direction: { type: String, default: 'none' },
    isRatioRaw: { type: Boolean, default: false },
    /** 输入单位已是「亿元」(如 △EVE), 不再做 万/亿 换算 */
    isYi: { type: Boolean, default: false }
  },
  render(h, ctx) {
    const { kind, current, base, direction, isRatioRaw, isYi } = ctx.props
    if (current == null || base == null) return h('span')
    const c = Number(current), b = Number(base)
    if (isNaN(c) || isNaN(b)) return h('span')
    const diff = c - b

    // 变化量口径（用户要求）:
    //   百分比类指标 → 用小数表示差值 (如 ROE 10.00%→10.39% 显示 0.39)
    //   金额类指标   → 用绝对值表示差额 (如 101310.28 亿→92833.98 亿 显示 -8476.30 亿)
    let arrow = '→'
    let text = ''
    let baseText = ''
    if (kind === 'ratio') {
      const cur = isRatioRaw ? c : c * 100
      const bas = isRatioRaw ? b : b * 100
      const d = cur - bas
      arrow = d > 0 ? '↑' : (d < 0 ? '↓' : '→')
      text = (d > 0 ? '+' : '') + d.toFixed(2)
      baseText = (isRatioRaw ? b.toFixed(2) + '%' : (b * 100).toFixed(2) + '%')
    } else {
      if (b === 0) return h('span')
      arrow = diff > 0 ? '↑' : (diff < 0 ? '↓' : '→')
      const abs = Math.abs(diff)
      const unit = isYi ? ' 亿' : ''
      const absText = isYi ? abs.toFixed(2) : fmtMoneyVal(abs).replace(/^-/, '')
      text = (diff > 0 ? '+' : (diff < 0 ? '-' : '')) + absText + unit
      baseText = isYi ? b.toFixed(2) + ' 亿' : fmtMoneyVal(b)
    }

    let cls = 'cmp-none'
    if (direction === 'higher') cls = diff > 0 ? 'cmp-up' : (diff < 0 ? 'cmp-down' : 'cmp-none')
    else if (direction === 'lower') cls = diff < 0 ? 'cmp-up' : (diff > 0 ? 'cmp-down' : 'cmp-none')
    else cls = diff > 0 ? 'cmp-blue' : (diff < 0 ? 'cmp-orange' : 'cmp-none')

    // 变化量四舍五入后为 0 时, 抹掉负号, 避免出现 "-0.00" 这种无意义显示
    // (如贷款利率基期 3.89% vs 当前 3.8855%, 差值 -0.0045 -> "-0.00")
    const rounded = parseFloat(text)
    if (rounded === 0) {
      text = '0.00'
      if (direction === 'higher') cls = 'cmp-none'
      else if (direction === 'lower') cls = 'cmp-none'
      else cls = 'cmp-none'
    }

    // 方向由主值旁的箭头表达, 这里只给「基期值 + 变化幅度」, 避免同一张卡出现两个箭头
    return h('span', { class: 'cmp-tag ' + cls }, [
      '基期 ', h('span', { class: 'cmp-base' }, [baseText]),
      h('span', { class: 'cmp-delta ' + cls }, [' · ' + text])
    ])
  }
}

export default {
  name: 'ReverseDashboardPanels',
  components: { VChart, KpiCompare },
  data() {
    return {
      loading: false,
      options: { schemes: [], default: {} },
      runs: [],
      dates: [],
      snapshot: {},
      filter: { schemeCode: null, runId: null, dateOffset: 1 },
      radarChart: null,
      _rerenderTimer: null,
      // ===== 趋势图指标开关 (默认只显示 ROE) =====
      TREND_METRICS,
      trendMetrics: ['ROE'],
      // ===== 目标达成 =====
      // ===== 余额口径 =====
      balanceMode: 'base',
      balanceFilterCat: '',
      balanceBarChart: null,
      balanceTrendChart: null,
      balanceTrendView: 'category',
      balanceTrendTopN: 10,
      balanceTrendSingleCode: '',
      balanceTrendData: null,
      balanceTrendLoading: false,
      // ===== 导出 =====
      exporting: false
    }
  },
  computed: {
    kpi() { return this.snapshot.kpi || {} },
    /** 基期 KPI (date_offset=1) — 用于 KPI 卡的「基期 vs 当前」对比 */
    kpiBase() { return this.snapshot.kpi_base || {} },
    thresholds() { return this.snapshot.thresholds || {} },
    riskAlerts() { return this.snapshot.risk_alerts || [] },
    nodeMatrix() { return this.snapshot.node_matrix || [] },
    targets() { return this.snapshot.targets || [] },
    catDist() { return this.snapshot.category_distribution || {} },
    /** 末级节点（按 is_leaf 标记） */
    leafNodes() {
      return this.nodeMatrix.filter(n => n.is_leaf === true || n.is_leaf === 1)
    },
    /**
     * <p>末级节点余额排行 — 全部末级节点, 按当前余额绝对值从大到小</p>
     *
     * <p>后端 top_nodes 已按「仅末级节点 + |余额| 降序」输出 (覆盖全部 COA), 此处只补
     * absBalance 辅助列供 el-table default-sort 使用。</p>
     *
     * @returns {Array<Object>} 排序后的末级节点
     */
    leafNodesRanked() {
      return (this.snapshot.top_nodes || []).map(n => ({
        ...n,
        absBalance: Math.abs(Number(n.current_balance || 0)) || 0
      }))
    },
    /** 末级节点余额（按当前口径） */
    leafBalances() {
      const useBase = this.balanceMode === 'base'
      const rows = this.leafNodes.map(n => ({
        code: n.node_code,
        name: n.node_name || n.node_code,
        category: n.category,
        value: Number(useBase ? (n.base_balance || 0) : (n.current_balance || 0)) || 0
      }))
      return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    },
    balanceTrendMonths() { return (this.balanceTrendData && this.balanceTrendData.months || []).length },
    /** 单节点下拉选项 (末级节点, 按余额规模降序) */
    balanceTrendNodeOptions() {
      const ns = (this.balanceTrendData && this.balanceTrendData.nodes) || []
      return ns.map(n => ({
        code: n.code,
        name: n.name || n.code,
        category: n.category,
        total: n.total
      }))
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
      // 只渲染用户勾选的指标 (默认只勾 ROE):
      // 5 条线量级差 100 倍 (LCR 148 vs ROE 12), 全开时 ROE/CET1 会被压成直线
      const metricSeries = TREND_METRICS.filter(m => this.trendMetrics.includes(m.key))
      const series = metricSeries.map(s => ({
        name: s.label,
        type: 'line',
        yAxisIndex: s.axis,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        itemStyle: { color: s.color },
        emphasis: { focus: 'series' },
        data: t[s.key] || []
      }))
      // 浮窗: 指标值 + 单位 (% / 亿)
      const unitOf = k => (k === 'DELTA_EVE' ? ' 亿' : '%')
      return {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params) => {
            if (!params || !params.length) return ''
            const month = params[0].axisValue
            const lines = params.map(p => {
              const m = TREND_METRICS.find(x => x.label === p.seriesName)
              const unit = m ? unitOf(m.key) : ''
              const val = p.value == null ? '-' : Number(p.value).toFixed(2)
              return `${p.marker}${p.seriesName}: <b>${val}${unit}</b>`
            })
            return `<b>${month}</b><br/>${lines.join('<br/>')}`
          }
        },
        legend: { data: metricSeries.map(s => s.label), top: 0, right: 0, textStyle: { fontSize: 11 } },
        grid: { left: 55, right: 55, top: 40, bottom: 45 },
        // 注意: yAxis 为数组时, xAxis 也必须是数组, 否则 ECharts 5 无法配对 → 图表整体空白
        xAxis: [{ type: 'category', data: months, axisLabel: { fontSize: 10, rotate: 40 } }],
        yAxis: [
          { type: 'value', name: '%', position: 'left', axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: 'dashed' } } },
          { type: 'value', name: '亿', position: 'right', axisLabel: { fontSize: 11 }, splitLine: { show: false } }
        ],
        series: series
      }
    },
    /** 大类余额分布环形图 (口径随 balanceMode 切换) — 对位原系统 distOpt */
    donutOption() {
      const cd = this.snapshot.category_distribution || {}
      const isBase = this.balanceMode === 'base'
      const d = (isBase ? cd.by_balance : cd.by_balance_forecast) || {}
      const bDate = isBase ? cd.balance_date : cd.forecast_date
      const label = isBase ? '当前余额' : '预测余额'
      const data = Object.entries(d).map(([k, v]) => ({ name: this.catLabel(k), value: v, _cat: k }))
      return {
        tooltip: {
          trigger: 'item',
          formatter: (p) => `${p.name}<br/>${label}：${this.fmtMoney(p.value)}<br/>占比：${p.percent}%${bDate ? `<br/>${isBase ? '基准日' : '预测月'}：${bDate}` : ''}`
        },
        legend: { orient: 'vertical', right: 5, top: 'middle', textStyle: { fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
        series: [{
          name: isBase ? '当前余额分布' : '预测余额分布',
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
    /** 大类金额分布柱状图 (与环形图同源, 口径随 balanceMode 切换) — 对位原系统 distBarOpt */
    barOption() {
      const cd = this.snapshot.category_distribution || {}
      const isBase = this.balanceMode === 'base'
      const d = (isBase ? cd.by_balance : cd.by_balance_forecast) || {}
      const cnt = cd.by_count || {}
      const bDate = isBase ? cd.balance_date : cd.forecast_date
      const label = isBase ? '当前余额' : '预测余额'
      const data = Object.entries(d).map(([k, v]) => ({ name: this.catLabel(k), value: v, _cat: k }))
      return {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (ps) => {
            const p = ps[0]
            const cat = data[p.dataIndex] ? data[p.dataIndex]._cat : ''
            return `${p.name}<br/>${label}：${this.fmtMoney(p.value)}${bDate ? `<br/>${isBase ? '基准日' : '预测月'}：${bDate}` : ''}<br/>节点数：${cnt[cat] || 0}`
          }
        },
        grid: { left: 70, right: 20, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { fontSize: 11 } },
        yAxis: {
          type: 'value',
          name: label,
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { align: 'right', color: '#8f959e', fontSize: 11 },
          axisLabel: { formatter: (v) => this.axisMoney(v) }
        },
        series: [{
          name: label,
          type: 'bar',
          barWidth: '50%',
          data: data.map(d => ({
            value: d.value,
            itemStyle: { color: CATEGORY_COLORS[d._cat] || '#999' }
          })),
          label: { show: true, position: 'top', fontSize: 11, formatter: (p) => this.fmtMoney(p.value) }
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
      this.renderBalanceCharts()
    })
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.radarChart) this.radarChart.dispose()
    if (this.balanceBarChart) this.balanceBarChart.dispose()
    if (this.balanceTrendChart) this.balanceTrendChart.dispose()
  },
  methods: {
    /** 窗口 resize 时重渲染 radar + 余额图 */
    onResize() {
      if (this.radarChart) this.radarChart.resize()
      if (this.balanceBarChart) this.balanceBarChart.resize()
      if (this.balanceTrendChart) this.balanceTrendChart.resize()
    },
    /** 重渲染所有图表 (radar + 余额图) */
    renderAll() {
      this.$nextTick(() => {
        this.renderRadar()
        this.renderBalanceBar()
        this.renderBalanceTrend()
      })
    },
    /** 加载方案下拉选项 (含默认值) */
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
    /** 加载当前方案下的运行列表 */
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
    /** 加载当前 run 的月份列表 */
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
    /** 加载全量快照 (kpi/trend/top_nodes/risk_alerts/node_matrix/...) */
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
    /** 方案切换 — 触发 loadRuns + loadSnapshot */
    onSchemeChange() {
      // 切换方案 → 余额走势缓存失效 (不同 run 的数据不同)
      this.balanceTrendData = null
      this.loadRuns().then(() => this.loadSnapshot())
    },
    /** 运行切换 — 触发 loadDates + loadSnapshot */
    onRunChange() {
      this.balanceTrendData = null
      this.loadDates().then(() => this.loadSnapshot())
    },
    /** 月份切换 — 直接 reload snapshot */
    onDateChange() { this.loadSnapshot() },
    /**
     * <p>趋势图指标勾选切换</p>
     *
     * <p>由 el-checkbox 的 @change 传入新勾选状态; 至少保留 1 个指标,
     * 全部取消时自动回落到 ROE (避免空图)。</p>
     *
     * @param {string} key  指标 key (ROE/CET1/LCR/NSFR/DELTA_EVE)
     * @param {boolean} next 新的勾选状态
     * @returns {void}
     */
    toggleTrendMetric(key, next) {
      const i = this.trendMetrics.indexOf(key)
      const on = next === undefined ? i < 0 : !!next
      if (on) {
        if (i < 0) this.trendMetrics.push(key)
      } else if (i >= 0) {
        this.trendMetrics.splice(i, 1)
        if (!this.trendMetrics.length) this.trendMetrics.push('ROE')
      }
    },
    /**
     * <p>余额口径切换 (基准日当前余额 / 当月预测余额)</p>
     *
     * <p>影响: 大类余额分布(环形+金额柱图) 与 末级节点余额分布。
     * 环形图/柱图是 computed 自动响应, 末级节点柱图是 echarts 实例需手动重绘。</p>
     *
     * @returns {void}
     */
    onBalanceModeChange() {
      this.renderBalanceCharts()
    },

    /**
     * <p>贷款加权平均利率: 小数 → 百分数</p>
     *
     * <p>库中 weighted_rate 存的是小数 (如 0.038855 = 3.89%), 后端 loan_weighted_rate
     * 也是小数口径; 前端要显示成百分数必须 ×100 — 对齐 Python 原系统
     * {@code (k.loan_weighted_rate * 100).toFixed(2)}。</p>
     *
     * @param {number} v 小数利率 (0.038855)
     * @returns {number|null} 百分数 (3.8855) | null
     */
    loanRatePct(v) {
      if (v == null) return null
      const n = Number(v)
      if (isNaN(n)) return null
      return n * 100
    },
    /**
     * <p>阈值达标状态 (对位原系统 KPI 卡前缀红色箭头)</p>
     *
     * <p>原系统用红色 ↓/↑ 箭头标示「不达标 / 超标」; 这里改用文字徽标, 语义更明确且不与
     * 「基期变化方向」混淆。</p>
     *
     * <p>判定规则 (与后端 thresholds 一致):</p>
     * <ul>
     *   <li>ROE / CET1 / LCR / NSFR — 有下限 min, 低于 min 为不达标</li>
     *   <li>DELTA_EVE — 有绝对值上限 max_abs, 超过为超标</li>
     * </ul>
     *
     * @param {string} metricKey 'ROE' | 'CET1' | 'LCR' | 'NSFR' | 'DELTA_EVE'
     * @param {number} value     当前值
     * @returns {string} '' (达标) | '未达标' | '超标'
     */
    thresholdStatus(metricKey, value) {
      if (value == null) return ''
      const v = Number(value)
      if (isNaN(v)) return ''
      const th = (this.thresholds || {})[metricKey] || {}
      if (metricKey === 'DELTA_EVE') {
        const maxAbs = th.max_abs
        if (maxAbs == null) return ''
        return Math.abs(v) > Number(maxAbs) ? '超标' : ''
      }
      const min = th.min
      if (min == null) return ''
      return v < Number(min) ? '未达标' : ''
    },
    /**
     * <p>阈值达标状态对应的徽标样式类</p>
     *
     * @param {string} status thresholdStatus 返回值
     * @returns {string} CSS 类名
     */
    thresholdStatusCls(status) {
      return status ? 'kpi-status kpi-status-' + (status === '超标' ? 'bad' : 'warn') : ''
    },
    /**
     * <p>从 kpi.metric_avg 取某个指标均值</p>
     *
     * @param {string} k 指标 key (ROE/CET1/LCR/NSFR/DELTA_EVE)
     * @returns {number} 平均值
     */
    metricAvg(k) {
      const m = this.kpi.metric_avg || {}
      return m[k]
    },
    /**
     * <p>金额格式化 (元/万/亿, 自动切换单位)</p>
     *
     * @param {number} v 金额 (元)
     * @returns {string} 格式化字符串
     */
    fmtMoney(v) { return fmtMoneyVal(v) },
    /**
     * <p>EVE 金额格式化 (固定保留 2 位小数 + "亿" 单位, 已在 snapshot 中是亿元)</p>
     *
     * @param {number} v EVE 数值 (亿元)
     * @returns {string} 格式化字符串
     */
    fmtMoneyEve(v) {
      if (v == null) return '-'
      return Number(v).toFixed(2)
    },
    /**
     * <p>数值 → 百分比显示 (NaN/空 → '-')</p>
     *
     * @param {number} v 原始数值
     * @param {number} [digits=2] 小数位数
     * @returns {string} 百分比字符串
     */
    pctOrDash(v, digits = 2) {
      if (v == null) return '-'
      const n = Number(v)
      if (isNaN(n)) return '-'
      return n.toFixed(digits) + '%'
    },
    /**
     * <p>大类 key → 中文标签</p>
     *
     * @param {string} c 大类 key
     * @returns {string} 中文标签
     */
    catLabel(c) {
      return ({ ASSET: '资产', LIABILITY: '负债', EQUITY: '权益', OFF_BALANCE: '表外', OTHER: '其他' })[c] || (c || '-')
    },
    /**
     * <p>大类 key → Element UI tag 类型</p>
     *
     * @param {string} c 大类 key
     * @returns {string} tag 类型
     */
    catTagType(c) {
      return ({ ASSET: 'success', LIABILITY: 'warning', EQUITY: 'info', OFF_BALANCE: '', OTHER: 'danger' })[c] || ''
    },

    // ================================================================
    // 目标达成（对齐原系统 ReverseDashboard.tsx TargetRow）
    // ================================================================
    /**
     * <p>KPI 卡「基期 vs 当前」对比标签 — 对位原系统 CompareTag</p>
     *
     * <p>kind='amount' → 变化率百分比 (如 +8.25%)；
     * kind='ratio' → 百分点差 (如 +1.25pp)，<b>isRatioRaw</b> 为 true 时输入已是百分数。</p>
     *
     * @param {string} kind     'amount' | 'ratio'
     * @param {number} current  当前值
     * @param {number} base     基期值
     * @param {string} direction 'higher' | 'lower' | 'none'
     * @param {boolean} [isRatioRaw] 输入是否已是百分数 (避免 ×100)
     * @returns {string} 对比文本
     */
    /**
     * <p>指标类型 → 中文标签</p>
     * @param {string} m 指标类型 (ROE/CET1/LCR/NSFR/DELTA_EVE)
     * @returns {string} 中文标签
     */
    metricLabel(m) {
      return ({ ROE: 'ROE 净资产收益率', CET1: 'CET1 核心一级', LCR: 'LCR 流动性覆盖',
                NSFR: 'NSFR 净稳定资金', DELTA_EVE: '△EVE 利率风险' })[m] || ''
    },
    /**
     * <p>指标类型 → 主题色</p>
     * @param {string} m 指标类型
     * @returns {string} 颜色
     */
    metricColor(m) {
      return ({ ROE: '#722ed1', CET1: '#1890ff', LCR: '#52c41a',
                NSFR: '#13c2c2', DELTA_EVE: '#eb2f96' })[m] || '#303133'
    },
    /**
     * <p>约束类型 → 符号</p>
     * @param {string} c 约束类型 (GE/LE/EQ)
     * @returns {string} 符号
     */
    constraintSymbol(c) {
      return c === 'LE' ? '≤' : (c === 'EQ' ? '=' : '≥')
    },
    /**
     * <p>目标值 / 实际值格式化 (% 类指标保留 2 位小数 + %, 其余走金额)</p>
     * @param {number} v 数值
     * @param {string} m 指标类型
     * @returns {string} 格式化字符串
     */
    formatTargetValue(v, m) {
      if (v == null) return '-'
      const n = Number(v)
      if (isNaN(n)) return '-'
      // DELTA_EVE 目标值单位是「亿」(如 -500 = -500 亿), 其余 % 类指标
      if (m === 'DELTA_EVE') return n.toFixed(2) + ' 亿'
      return n.toFixed(2) + '%'
    },
    /**
     * <p>完成率 → 进度条百分比 (0~100, 空值 → 0)</p>
     * @param {number} r 完成率
     * @returns {number} 百分比
     */
    progressPct(r) {
      if (r == null) return 0
      const n = Number(r)
      if (isNaN(n)) return 0
      return Math.max(0, Math.min(100, n))
    },
    /**
     * <p>进度条颜色 (达成绿 / 未达成红 / 不可比灰)</p>
     * @param {Object} t 目标行
     * @returns {string} 颜色
     */
    progressColor(t) {
      if (t.achieved == null) return '#d9d9d9'
      return t.achieved ? '#52c41a' : '#f5222d'
    },
    /**
     * <p>完成率文本样式 (达成绿 / 未达成红 / 不可比灰)</p>
     * @param {Object} t 目标行
     * @param {string} [which] 'm12' 取 M12 完成率
     * @returns {string} CSS 类
     */
    rateClass(t, which) {
      const r = which === 'm12' ? t.m12_rate : t.current_rate
      if (r == null) return 'rate-none'
      if (t.achieved == null) return 'rate-none'
      return t.achieved ? 'rate-ok' : 'rate-bad'
    },

    // ================================================================
    // 末级节点余额（对齐原系统 ReverseDashboard.tsx 区块 7/8）
    // ================================================================
    /**
     * <p>渲染末级节点余额横向条形图</p>
     */
    renderBalanceCharts() {
      this.renderBalanceBar()
      this.renderBalanceTrend()
    },
    /**
     * <p>末级节点余额横向条形图 (按 |余额| 降序, 金额大的在顶部, 按大类着色)</p>
     *
     * <p>注意: ECharts 横向条形图的 y 轴 (category) 是<strong>自下而上</strong>排列的,
     * 即数组第 0 项显示在最下方。要让金额大的排在顶部, 必须把降序数组再反转一次。
     * (原系统 ReverseDashboard.tsx 的注释写的是「倒序绘制, 使最大条在顶部」,
     *  但代码里漏了 reverse, 实际效果与注释不符 — 此处按注释的意图实现)</p>
     */
    renderBalanceBar() {
      if (!this.$refs.balanceBarChart) return
      if (!this.balanceBarChart) this.balanceBarChart = echarts.init(this.$refs.balanceBarChart)
      let rows = this.leafBalances
      if (this.balanceFilterCat) rows = rows.filter(r => r.category === this.balanceFilterCat)
      // leafBalances 已按 |余额| 降序; 反转后 y 轴自下而上绘制 → 金额大的显示在顶部
      rows = rows.slice().reverse()
      const useBase = this.balanceMode === 'base'
      const bDate = useBase ? this.catDist.balance_date : this.catDist.forecast_date
      this.balanceBarChart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (p) => {
            const r = rows[p.dataIndex]
            if (!r) return ''
            return `${r.code} · ${r.name}<br/>大类：${this.catLabel(r.category)}<br/>` +
                   `${useBase ? '基准日当前余额' : '当月预测余额'}：<b>${this.fmtMoney(r.value)}</b>` +
                   (bDate ? `<br/>${useBase ? '基准日' : '预测月'}：${bDate}` : '')
          }
        },
        grid: { left: 220, right: 110, top: 20, bottom: 56 },
        xAxis: {
          type: 'value',
          name: useBase ? '基准日当前余额' : '当月预测余额',
          nameLocation: 'middle',
          nameGap: 36,
          axisLabel: { fontSize: 10, formatter: (v) => this.axisMoney(v) }
        },
        yAxis: {
          type: 'category',
          data: rows.map(r => r.name),
          axisLabel: { fontSize: 11, width: 200, overflow: 'truncate' },
          axisTick: { alignWithLabel: true }
        },
        series: [{
          name: '余额',
          type: 'bar',
          barWidth: '58%',
          data: rows.map(r => ({
            value: r.value,
            itemStyle: { color: CATEGORY_COLORS[r.category] || '#999' }
          })),
          label: {
            show: true, position: 'right', fontSize: 10,
            formatter: (p) => this.fmtMoney(p.value)
          }
        }]
      }, true)
      // 高度随节点数自适应
      const h = Math.max(420, 22 * rows.length)
      this.balanceBarChart.getDom().style.height = h + 'px'
      this.balanceBarChart.resize()
    },
    /**
     * <p>加载并渲染末级账户册余额走势</p>
     */
    async renderBalanceTrend() {
      if (!this.$refs.balanceTrendChart) return
      if (!this.balanceTrendChart) this.balanceTrendChart = echarts.init(this.$refs.balanceTrendChart)
      if (!this.balanceTrendData) {
        this.balanceTrendLoading = true
        try {
          const qs = new URLSearchParams({
            scheme_code: this.filter.schemeCode || '',
            run_id: this.filter.runId || ''
          }).toString()
          const r = await (await fetch('/prcp-java/api/reverse-dashboard/balance-trend?' + qs,
                                       { headers: tokenH() })).json()
          if (r.code === 0) this.balanceTrendData = r.data || null
        } catch (e) {
          console.warn('balance-trend failed', e)
        } finally {
          this.balanceTrendLoading = false
        }
      }
      const d = this.balanceTrendData
      if (!d || !(d.months || []).length) return
      const months = d.months.map(m => String(m.date || '').slice(0, 7))
      let series = []
      if (this.balanceTrendView === 'single') {
        // 单节点: 只画选中的那一个节点 (未选中时默认取第一个, 并同步下拉框)
        const all = d.nodes || []
        if (!this.balanceTrendSingleCode && all.length) {
          this.balanceTrendSingleCode = all[0].code
        }
        const picked = this.balanceTrendSingleCode
          ? all.filter(n => n.code === this.balanceTrendSingleCode)
          : (all.length ? [all[0]] : [])
        series = picked.map(n => ({
          name: n.name || n.code,
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.4 },
          itemStyle: { color: CATEGORY_COLORS[n.category] || '#5B8FF9' },
          areaStyle: { color: 'rgba(91, 143, 249, 0.12)' },
          data: n.values || []
        }))
      } else if (this.balanceTrendView === 'node') {
        let nodes = d.nodes || []
        if (this.balanceTrendTopN !== 'all') nodes = nodes.slice(0, Number(this.balanceTrendTopN) || 10)
        series = nodes.map(n => ({
          name: n.name || n.code,
          type: 'line',
          smooth: true,
          symbolSize: 4,
          lineStyle: { width: 1.8 },
          itemStyle: { color: CATEGORY_COLORS[n.category] || '#5B8FF9' },
          data: n.values || []
        }))
      } else {
        series = (d.categories || []).map(c => ({
          name: this.catLabel(c.key),
          type: 'line',
          smooth: true,
          symbolSize: 4,
          lineStyle: { width: 2 },
          itemStyle: { color: CATEGORY_COLORS[c.key] || '#5B8FF9' },
          data: c.values || []
        }))
      }
      // 稠密降级 (>20 条线隐藏 symbol)
      const dense = series.length > 20
      if (dense) series.forEach(s => { s.symbolSize = 0; s.showSymbol = false; s.lineStyle.width = 1.1 })
      this.balanceTrendChart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line' },
          formatter: (ps) => {
            if (!ps.length) return ''
            const head = `<b>M${this.balanceTrendData.months[ps[0].dataIndex].offset} · ${months[ps[0].dataIndex]}</b>`
            return head + '<br/>' + ps.map(p =>
              `${p.marker}${p.seriesName}<br/>月末余额：<b>${this.fmtMoney(p.value)}</b>`).join('<br/>')
          }
        },
        legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 10 } },
        grid: { left: 100, right: 30, top: 30, bottom: 56 },
        xAxis: { type: 'category', boundaryGap: false, data: months, axisLabel: { fontSize: 10, rotate: 45 } },
        yAxis: {
          type: 'value',
          name: '月末余额',
          nameLocation: 'middle',
          nameGap: 70,
          axisLabel: { fontSize: 10, formatter: (v) => this.axisMoney(v) }
        },
        series: series
      }, true)
      const h = Math.max(420, 40 + series.length * 16)
      this.balanceTrendChart.getDom().style.height = h + 'px'
      this.balanceTrendChart.resize()
    },
    /**
     * <p>坐标轴金额格式化 (万亿 / 亿 / 万)</p>
     * @param {number} v 金额
     * @returns {string} 格式化字符串
     */
    axisMoney(v) {
      const n = Number(v)
      if (isNaN(n)) return ''
      const a = Math.abs(n)
      if (a >= 1e12) return (n / 1e12).toFixed(1) + '万亿'
      if (a >= 1e8) return (n / 1e8).toFixed(0) + '亿'
      if (a >= 1e4) return (n / 1e4).toFixed(0) + '万'
      return n.toFixed(0)
    },

    /** 渲染 5 指标评分雷达 (ROE/CET1/LCR/NSFR/△EVE) */
    renderRadar() {
      if (!this.$refs.radarChart) return
      if (!this.radarChart) this.radarChart = echarts.init(this.$refs.radarChart)
      const scores = this.snapshot.kpi_scores || []
      // 取 5 个 REG_* 指标的 score
      // 🆕 分数制已切换到 0-500 (v12b 评分规则), 雷达 max 跟随
      // 🆕 修复: DB 里 EVE 的 kpi_code 是 'REG_EVE' (不是 'REG_DELTA_EVE'), 用显式映射代替 endsWith
      const MAX_SCORE = 500
      // label -> kpi_code 后缀 (直接对应 prcp_kpi_definition.kpi_code 去掉 'REG_' 前缀)
      const LABEL_TO_KPI = {
        'ROE':   'ROE',
        'CET1':  'CET1',
        'LCR':   'LCR',
        'NSFR':  'NSFR',
        '△EVE':  'EVE'         // 关键: DB 存的是 'EVE', 不是 'DELTA_EVE'
      }
      const labels = Object.keys(LABEL_TO_KPI)
      // 长标签 (对位原系统 ReverseDashboard.tsx radarOpt)
      const LONG_LABELS = {
        'ROE': 'ROE 净资产收益率',
        'CET1': 'CET1 核心一级',
        'LCR': 'LCR 流动性覆盖',
        'NSFR': 'NSFR 净稳定资金',
        '△EVE': '△EVE 利率风险'
      }
      // 取每个指标的 score 与 value (指标值)
      const scoreOf = labels.map(label => {
        const suffix = LABEL_TO_KPI[label]
        const s = scores.find(x => (x && x.kpi_code || '') === 'REG_' + suffix)
        return s && s.score != null ? Number(s.score) : 0
      })
      const valueOf = labels.map(label => {
        const suffix = LABEL_TO_KPI[label]
        const s = scores.find(x => (x && x.kpi_code || '') === 'REG_' + suffix)
        return s && s.value != null ? Number(s.value) : null
      })
      const values = scoreOf
      // 指标值的展示: 比率型带 %, EVE 为亿元
      const fmtMetricValue = (label, v) => {
        if (v == null) return '-'
        const suffix = LABEL_TO_KPI[label]
        if (suffix === 'EVE') return v.toFixed(2) + ' 亿'
        return v.toFixed(2) + '%'
      }
      // 图例索引表: 图例名 → 指标下标
      const legendIdx = {}
      labels.forEach((l, i) => { legendIdx[l] = i })
      // 评分档位配色 (对齐原系统 ScoreTag: 480+ 绿 / 300+ 青 / 150+ 金 / 0+ 橙 / 0 红)
      const scoreColor = (sc) => {
        if (sc >= 480) return '#52c41a'
        if (sc >= 300) return '#13c2c2'
        if (sc >= 150) return '#faad14'
        if (sc > 0) return '#fa8c16'
        return '#f5222d'
      }
      this.radarChart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: () => {
            // 浮窗只保留「指标值 + 评分」, 不展示档位说明 (档位已由图例/顶点颜色表达)
            const lines = labels.map((label, i) => {
              const color = scoreColor(scoreOf[i])
              return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px"></span>` +
                     `${LONG_LABELS[label]}: <b>${fmtMetricValue(label, valueOf[i])}</b>` +
                     `　评分 <b>${scoreOf[i].toFixed(0)}</b>`
            })
            return `<b>指标评分雷达 (0-500)</b><br/>${lines.join('<br/>')}`
          }
        },
        legend: {
          bottom: 0,
          textStyle: { fontSize: 11 },
          itemWidth: 10,
          itemHeight: 10,
          // 图例按指标列出各自分数, 并按评分档位着色 (对齐原系统 ScoreTag 配色)
          formatter: (name) => {
            const i = legendIdx[name]
            if (i == null) return name
            return `${name} ${scoreOf[i].toFixed(0)}`
          },
          data: labels.map((label, i) => ({
            name: label,
            itemStyle: { color: scoreColor(scoreOf[i]) }
          }))
        },
        radar: {
          indicator: labels.map(k => ({ name: LONG_LABELS[k], max: MAX_SCORE })),
          shape: 'polygon',
          radius: '62%',
          center: ['50%', '48%'],
          splitNumber: 5,                                       // 5 段 (0/100/200/300/400/500)
          axisName: { color: '#25334B', fontSize: 10, fontWeight: 600 },
          splitArea: { areaStyle: { color: ['rgba(11, 111, 242, 0.04)', 'rgba(11, 111, 242, 0.10)'] } },
          splitLine: { lineStyle: { color: '#D9E5F7' } },
          axisLine: { lineStyle: { color: '#C8D5EC' } }
        },
        // ⚠️ ECharts 的 radar series 不支持 legend (legend 只绑定 series.name),
        //    故拆成 5 个「单指标」series —— 每个指标一个, 只有自己那一维有值 ('-' 表示空点),
        //    这样图例可显示 5 个指标并支持点击开关。
        //    但单指标 series 连线会形成星芒形, 故额外叠加一个「完整轮廓」series (不参与图例),
        //    让雷达轮廓保持完整五边形。
        series: [
          // ① 完整轮廓 (legend 里不显示)
          {
            type: 'radar',
            name: '评分轮廓',
            symbol: 'none',
            lineStyle: { color: '#5B8FF9', width: 2 },
            itemStyle: { color: '#5B8FF9' },
            areaStyle: { color: 'rgba(91, 143, 249, 0.28)' },
            data: [{ value: values, name: '评分轮廓', symbol: 'none' }]
          },
          // ② 5 个单指标 series (参与图例, 顶点用档位色)
          ...labels.map((label, i) => ({
            type: 'radar',
            name: label,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { color: 'transparent', width: 0 },
            itemStyle: { color: scoreColor(scoreOf[i]) },
            areaStyle: { color: 'transparent' },
            data: [{
              value: labels.map((_, j) => (j === i ? scoreOf[i] : '-')),
              name: label,
              symbol: 'circle',
              symbolSize: 9,
              lineStyle: { color: 'transparent', width: 0 },
              itemStyle: { color: scoreColor(scoreOf[i]), borderColor: '#fff', borderWidth: 1.5 }
            }]
          }))
        ]
      }, true)
    },

    /**
     * <p>导出测算结果 (xlsx) — 对位原系统 ReverseDashboard.tsx handleExport</p>
     *
     * <p>后端 GET /reverse-dashboard/balance-export 返回二进制流,
     * 含 4 个 Sheet: 账户册结构 / 按层级汇总 / 末级节点大类汇总 / 口径说明。</p>
     *
     * @returns {Promise<void>}
     */
    async exportResult() {
      const sc = this.filter.schemeCode
      if (!sc) {
        this.$message.warning('请先选择组合方案')
        return
      }
      this.exporting = true
      try {
        const qs = new URLSearchParams({ scheme_code: sc })
        if (this.filter.runId) qs.set('run_id', this.filter.runId)
        const res = await fetch('/prcp-java/api/reverse-dashboard/balance-export?' + qs.toString(),
          { headers: tokenH() })
        if (!res.ok) {
          let msg = '导出失败（HTTP ' + res.status + '）'
          try {
            const j = await res.json()
            if (j && j.msg) msg = j.msg
          } catch (e) { /* blob 响应读不出 detail, 用默认提示 */ }
          this.$message.error(msg)
          return
        }
        const cd = res.headers.get('content-disposition') || ''
        const m = cd.match(/filename\*=UTF-8''([^;]+)/i)
        const fname = m ? decodeURIComponent(m[1]) : ('组合反算结果导出_' + sc + '.xlsx')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fname
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        this.$message.success('已导出：' + fname)
      } catch (e) {
        this.$message.error('导出失败：' + (e.message || ''))
      } finally {
        this.exporting = false
      }
    }
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
/* 阈值达标状态徽标 (对位原系统 KPI 卡的红色达标箭头) */
.kpi-status {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  padding: 0 5px;
  border-radius: 3px;
  margin-left: 2px;
  white-space: nowrap;
}
.kpi-status-warn { color: #E6A23C; background: #FDF6EC; border: 1px solid #F5DAB1; }
.kpi-status-bad  { color: #F56C6C; background: #FEF0F0; border: 1px solid #FBC4BC; }
.radar-area { width: 100%; height: 200px; }
.radar-area-large { width: 100%; height: 340px; }

/* ===== Bottom Row ===== */
.bottom-row {
  margin: 0 16px 12px;
  display: grid;
  grid-template-columns: 5fr 3fr;
  gap: 12px;
}
.twocol-row { grid-template-columns: 1fr 1fr; }
/* 单卡片区块占满整行 (末级节点余额分布 / 末级账户册余额走势) */
.full-row { grid-template-columns: 1fr; }

/* ===== 目标达成进度卡片 ===== */
.target-card { margin: 0 16px 12px; border-radius: 8px; }
.target-hint { font-size: 12px; color: #909399; }
.target-head {
  display: flex; align-items: center;
  padding: 6px 0; font-size: 12px; color: #909399;
  border-bottom: 1px solid #f0f1f3; font-weight: 600;
}
.target-row {
  display: flex; align-items: center;
  padding: 8px 0; font-size: 13px;
  border-bottom: 1px solid #f5f7fa;
}
.target-row:last-child { border-bottom: none; }
/* ===== 目标达成表格列宽 (表头与数据行共用, 保证对齐) ===== */
.tc-name     { flex: 0 0 200px; width: 200px; }
.tc-target   { flex: 0 0 120px; width: 120px; }
.tc-actual   { flex: 0 0 120px; width: 120px; }
.tc-progress { flex: 1 1 auto; min-width: 140px; width: 100%; }
.tc-rate     { flex: 0 0 120px; width: 120px; text-align: right; }
.tc-m12      { flex: 0 0 130px; width: 130px; text-align: right; }
.target-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.target-val { color: #606266; }
.target-actual { font-weight: 600; }
/* el-progress 根节点默认无宽度, 必须显式撑满, 否则在 flex 里塌成 0 宽度不可见 */
.target-progress { padding-right: 16px; }
.target-progress >>> .el-progress { width: 100%; }
.target-rate { text-align: right; font-size: 12px; white-space: nowrap; }
.rate-ok { color: #52c41a; font-weight: 600; }
.rate-bad { color: #f5222d; font-weight: 600; }
.rate-none { color: #909399; }

/* ===== KPI 基期对比标签 ===== */
.kpi-compare { margin-top: 4px; font-size: 11px; line-height: 1.4; }
/* 注意: KpiCompare 是函数式组件, h() 创建的节点没有 data-v 属性,
   scoped 选择器 (.cmp-up[data-v-x]) 匹配不上 → 必须用深度选择器,
   编译后为 .kpi-compare[data-v-x] .cmp-up, 只要求祖先带 data-v 即可。 */
.kpi-compare >>> .cmp-tag { white-space: nowrap; }
.kpi-compare >>> .cmp-up { color: #52c41a; }
.kpi-compare >>> .cmp-down { color: #f5222d; }
.kpi-compare >>> .cmp-blue { color: #1890ff; }
.kpi-compare >>> .cmp-orange { color: #fa8c16; }
.kpi-compare >>> .cmp-none { color: #8f959e; }
/* 基期值: 灰色常量; 箭头 + 差值: 按方向着色 */
.kpi-compare >>> .cmp-base { color: #8f959e; }
.kpi-compare >>> .cmp-arrow { font-weight: 700; margin-left: 4px; }
.kpi-compare >>> .cmp-delta { font-weight: 700; }

/* ===== 末级节点余额（区块 5/6）===== */
.balance-controls { display: flex; gap: 8px; align-items: center; }
.balance-bar-area { width: 100%; height: 420px; }
.balance-trend-area { width: 100%; height: 420px; }
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
.dist-donut {
  width: 100%;
  height: 240px;
}
.dist-bar {
  width: 100%;
  height: 160px;
}
.dist-hint {
  font-size: 11px;
  color: #8f959e;
  line-height: 1.6;
  margin-bottom: 6px;
}
.dist-divider {
  margin: 8px 0 4px;
  font-size: 12px;
  color: #8f959e;
}
.trend-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 500;
}

/* 趋势图指标切换 (自绘 chip, 完全受控) */
.trend-metric-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 400;
}
.trend-metric-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid #E3E9F2;
  background: #F7F9FC;
  color: #6C7D96;
  cursor: pointer;
  user-select: none;
  transition: all .15s;
}
.trend-metric-chip:hover { border-color: #B5D4F4; }
.trend-metric-chip.is-on { font-weight: 500; }
/* 原生 checkbox 透明覆盖整个 chip: 既保留原生 label/change 行为, 又不显示默认方框 */
.trend-metric-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.trend-metric-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  opacity: .35;
  transition: opacity .15s;
}
.trend-metric-chip.is-on .trend-metric-dot { opacity: 1; }

/* 小屏适配 */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .bottom-row { grid-template-columns: 1fr; }
  .twocol-row { grid-template-columns: 1fr; }
}
</style>