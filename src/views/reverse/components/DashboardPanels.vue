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
          <span class="kpi-unit">元</span>
        </div>
        <div class="kpi-compare"><kpi-compare kind="amount" :current="kpi.asset_total" :base="kpiBase.asset_total" direction="none" /></div>
      </div>
      <!-- 负债余额 -->
      <div class="kpi-card kpi-liability">
        <div class="kpi-label"><i class="el-icon-takeaway-box"></i> 负债余额</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ fmtMoney(kpi.liability_total) }}</span>
          <span class="kpi-unit">元</span>
        </div>
        <div class="kpi-compare"><kpi-compare kind="amount" :current="kpi.liability_total" :base="kpiBase.liability_total" direction="none" /></div>
      </div>
      <!-- 贷款加权平均利率 -->
      <div class="kpi-card kpi-loan-rate">
        <div class="kpi-label"><i class="el-icon-money"></i> 贷款加权平均利率</div>
        <div class="kpi-value-wrap">
          <span class="kpi-value">{{ pctOrDash(kpi.loan_weighted_rate, 4) }}</span>
        </div>
        <div class="kpi-sub">境内各项人民币贷款下 5 个 L4 子节点按余额加权</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="kpi.loan_weighted_rate" :base="kpiBase.loan_weighted_rate" direction="none" :is-ratio-raw="true" /></div>
      </div>
      <!-- ROE 净资产收益率 -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-data-line"></i> ROE 净资产收益率</div>
        <div class="kpi-value-wrap">
          <span class="trend-icon-wrap" :class="metricTrend('ROE')">
            <i v-if="metricTrend('ROE')==='down'" class="trend-icon trend-down">↓</i>
            <i v-else-if="metricTrend('ROE')==='up'" class="trend-icon trend-up">↑</i>
            <span v-if="metricTrend('ROE')!=='flat'" class="trend-pct">{{ metricTrendPct('ROE') }}</span>
          </span>
          <span class="kpi-value">{{ pctOrDash(metricAvg('ROE')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.ROE?.min || 11 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('ROE')" :base="kpiBase.metric_avg?.ROE" direction="higher" /></div>
      </div>
      <!-- CET1 -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-medal"></i> CET1 核心一级</div>
        <div class="kpi-value-wrap">
          <span class="trend-icon-wrap" :class="metricTrend('CET1')">
            <i v-if="metricTrend('CET1')==='down'" class="trend-icon trend-down">↓</i>
            <i v-else-if="metricTrend('CET1')==='up'" class="trend-icon trend-up">↑</i>
            <span v-if="metricTrend('CET1')!=='flat'" class="trend-pct">{{ metricTrendPct('CET1') }}</span>
          </span>
          <span class="kpi-value">{{ pctOrDash(metricAvg('CET1')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.CET1?.min || 8.5 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('CET1')" :base="kpiBase.metric_avg?.CET1" direction="higher" /></div>
      </div>
      <!-- LCR -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-tickets"></i> LCR 流动性覆盖率</div>
        <div class="kpi-value-wrap">
          <span class="trend-icon-wrap" :class="metricTrend('LCR')">
            <i v-if="metricTrend('LCR')==='down'" class="trend-icon trend-down">↓</i>
            <i v-else-if="metricTrend('LCR')==='up'" class="trend-icon trend-up">↑</i>
            <span v-if="metricTrend('LCR')!=='flat'" class="trend-pct">{{ metricTrendPct('LCR') }}</span>
          </span>
          <span class="kpi-value">{{ pctOrDash(metricAvg('LCR')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.LCR?.min || 100 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('LCR')" :base="kpiBase.metric_avg?.LCR" direction="higher" /></div>
      </div>
      <!-- NSFR -->
      <div class="kpi-card">
        <div class="kpi-label"><i class="el-icon-files"></i> NSFR 净稳定资金</div>
        <div class="kpi-value-wrap">
          <span class="trend-icon-wrap" :class="metricTrend('NSFR')">
            <i v-if="metricTrend('NSFR')==='down'" class="trend-icon trend-down">↓</i>
            <i v-else-if="metricTrend('NSFR')==='up'" class="trend-icon trend-up">↑</i>
            <span v-if="metricTrend('NSFR')!=='flat'" class="trend-pct">{{ metricTrendPct('NSFR') }}</span>
          </span>
          <span class="kpi-value">{{ pctOrDash(metricAvg('NSFR')) }}</span>
        </div>
        <div class="kpi-sub">阈值 ≥ {{ thresholds.NSFR?.min || 100 }}%</div>
        <div class="kpi-compare"><kpi-compare kind="ratio" :current="metricAvg('NSFR')" :base="kpiBase.metric_avg?.NSFR" direction="higher" /></div>
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
        <div class="kpi-compare"><kpi-compare kind="amount" :current="metricAvg('DELTA_EVE')" :base="kpiBase.metric_avg?.DELTA_EVE" direction="lower" :is-yi="true" /></div>
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
            </el-select>
            <el-select v-if="balanceTrendView === 'node'" v-model="balanceTrendTopN" size="mini"
                       style="width:100px" @change="renderBalanceTrend">
              <el-option label="Top 5" :value="5" />
              <el-option label="Top 10" :value="10" />
              <el-option label="Top 15" :value="15" />
              <el-option label="Top 20" :value="20" />
              <el-option label="全部" value="all" />
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
import VChart from 'vue-echarts'
import * as echarts from 'echarts'
import { COLOR_PRIMARY, PALETTE_AUX, CATEGORY_COLORS, AXIS_COLORS, WARNING_LINE_STYLE, BASELINE_LINE_STYLE } from '@/utils/chartTheme'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/pie'
import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/radar'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/title'
import 'echarts/lib/component/markLine'

/**
 * @file 反算驾驶舱面板 (reverse/Index.vue 的 Tab 3 子组件)
 * @desc 嵌入 reverse/Index.vue 的「测算结果」Tab, 5 区块布局:
 *         1) Hero + 筛选条 (组合方案/运行/月份/运行摘要 tag)
 *         2) 目标达成进度卡片 (目标/实际/进度条/当前完成率/M12 完成率)
 *         3) 8 KPI 卡 (4 列 × 2 行: 资产/负债/贷款加权利率/ROE/CET1/LCR/NSFR/△EVE, 含基期对比)
 *         4) 双栏: 5 指标 24 月趋势 + 5 指标评分雷达
 *         5) 双栏: Top 10 节点 + 大类分布 (环形 + 柱图)
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
    let text = ''
    if (kind === 'ratio') {
      const cur = isRatioRaw ? c : c * 100
      const bas = isRatioRaw ? b : b * 100
      const d = cur - bas
      text = (d > 0 ? '+' : '') + d.toFixed(2) + 'pp'
    } else {
      if (b === 0) return h('span')
      const ratio = diff / Math.abs(b) * 100
      text = (ratio > 0 ? '+' : '') + ratio.toFixed(2) + '%'
    }
    let cls = 'cmp-none'
    if (direction === 'higher') cls = diff > 0 ? 'cmp-up' : (diff < 0 ? 'cmp-down' : 'cmp-none')
    else if (direction === 'lower') cls = diff < 0 ? 'cmp-up' : (diff > 0 ? 'cmp-down' : 'cmp-none')
    else cls = diff > 0 ? 'cmp-blue' : (diff < 0 ? 'cmp-orange' : 'cmp-none')
    const baseText = kind === 'ratio'
      ? (isRatioRaw ? b.toFixed(2) + '%' : (b * 100).toFixed(2) + '%')
      : (isYi ? b.toFixed(2) + ' 亿' : fmtMoneyVal(b))
    return h('span', { class: 'cmp-tag ' + cls }, [`基期 ${baseText} · ${text}`])
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
      // ===== 目标达成 =====
      // ===== 余额口径 =====
      balanceMode: 'base',
      balanceFilterCat: '',
      balanceBarChart: null,
      balanceTrendChart: null,
      balanceTrendView: 'category',
      balanceTrendTopN: 10,
      balanceTrendData: null,
      balanceTrendLoading: false
    }
  },
  computed: {
    kpi() { return this.snapshot.kpi || {} },
    /** 基期 KPI (date_offset=1) — 用于 KPI 卡的「基期 vs 当前」对比 */
    kpiBase() { return this.snapshot.kpi_base || {} },
    thresholds() { return this.snapshot.thresholds || {} },
    topNodes() { return this.snapshot.top_nodes || [] },
    riskAlerts() { return this.snapshot.risk_alerts || [] },
    nodeMatrix() { return this.snapshot.node_matrix || [] },
    targets() { return this.snapshot.targets || [] },
    catDist() { return this.snapshot.category_distribution || {} },
    /** 末级节点（按 is_leaf 标记） */
    leafNodes() {
      return this.nodeMatrix.filter(n => n.is_leaf === true || n.is_leaf === 1)
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
     * <p>判断指标趋势 (up/down/flat) — 对比基期 M0 (trend[0]) vs 当前 (trend[end])</p>
     *
     * <p>原系统对齐: 不与阈值比较, 而是与基期余额比较, 看"从起点到现在"是涨是跌
     * - 涨 → up (绿色 ↑)
     * - 跌 → down (红色 ↓)
     * - 平 → flat (灰色 —)
     * </p>
     *
     * @param {string} k 指标 key (ROE/CET1/LCR/NSFR)
     * @returns {string} 'up' | 'down' | 'flat'
     */
    metricTrend(k) {
      const series = (this.snapshot && this.snapshot.trend && this.snapshot.trend[k]) || []
      if (!series || series.length < 2) return 'flat'
      const first = Number(series[0])
      const last = Number(series[series.length - 1])
      if (isNaN(first) || isNaN(last) || first === 0) return 'flat'
      const diff = last - first
      const ratio = Math.abs(diff / first)
      // 涨跌幅 < 0.1% 视为持平
      if (ratio < 0.001) return 'flat'
      return diff > 0 ? 'up' : 'down'
    },
    /**
     * <p>从基期到当前的涨跌幅 (百分数, 用于箭头后显示)</p>
     *
     * @param {string} k 指标 key
     * @returns {string} e.g. '+1.5%' / '-0.3%'
     */
    metricTrendPct(k) {
      const series = (this.snapshot && this.snapshot.trend && this.snapshot.trend[k]) || []
      if (!series || series.length < 2) return ''
      const first = Number(series[0])
      const last = Number(series[series.length - 1])
      if (isNaN(first) || isNaN(last) || first === 0) return ''
      const diff = ((last - first) / first) * 100
      const sign = diff > 0 ? '+' : ''
      return sign + diff.toFixed(1) + '%'
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
     * <p>末级节点余额横向条形图 (按 |余额| 降序, 按大类着色)</p>
     */
    renderBalanceBar() {
      if (!this.$refs.balanceBarChart) return
      if (!this.balanceBarChart) this.balanceBarChart = echarts.init(this.$refs.balanceBarChart)
      let rows = this.leafBalances
      if (this.balanceFilterCat) rows = rows.filter(r => r.category === this.balanceFilterCat)
      const useBase = this.balanceMode === 'base'
      this.balanceBarChart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (p) => {
            const r = rows[p.dataIndex]
            if (!r) return ''
            return `${r.code} · ${r.name}<br/>大类：${this.catLabel(r.category)}<br/>` +
                   `${useBase ? '基准日当前余额' : '当月预测余额'}：<b>${this.fmtMoney(r.value)}</b>`
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
      if (this.balanceTrendView === 'node') {
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
      const values = labels.map(label => {
        const suffix = LABEL_TO_KPI[label]
        const s = scores.find(x => (x && x.kpi_code || '') === 'REG_' + suffix)
        return s && s.score != null ? Number(s.score) : 0
      })
      this.radarChart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (p) => {
            const lines = p.value.map((v, i) => `${labels[i]}: <b>${v.toFixed(0)}</b> / ${MAX_SCORE}`)
            return lines.join('<br/>')
          }
        },
        radar: {
          indicator: labels.map(k => ({ name: k, max: MAX_SCORE })),
          shape: 'polygon',
          radius: '62%',
          center: ['50%', '52%'],
          splitNumber: 5,                                       // 5 段 (0/100/200/300/400/500)
          axisName: { color: '#25334B', fontSize: 11, fontWeight: 600 },
          splitArea: { areaStyle: { color: ['rgba(11, 111, 242, 0.04)', 'rgba(11, 111, 242, 0.10)'] } },
          splitLine: { lineStyle: { color: '#D9E5F7' } },
          axisLine: { lineStyle: { color: '#C8D5EC' } }
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

    /** 导出当前快照 (开发中) */
    exportSnapshot() { this.$message.info('导出快照功能开发中…') },
    /** 导出当前趋势 (开发中) */
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

/* 🆕 趋势图标容器: 大号 + 加粗 + 与数值区对齐 */
.trend-icon-wrap {
  display: inline-flex;
  align-items: baseline;
  margin-right: 6px;
  font-weight: 700;                                      /* 加粗明细 */
}
.trend-icon-wrap .trend-icon {
  font-size: 22px;                                       /* 14 -> 22 (大号) */
  font-weight: 800;                                      /* 特粗 */
  margin-right: 2px;
  line-height: 1;
}
.trend-icon-wrap .trend-pct {
  font-size: 12px;
  font-weight: 600;
  margin-left: 2px;
  opacity: 0.85;
}
/* 重新定义颜色: ↑ 绿色, ↓ 红色 (对齐原系统 480+ 绿色 / 0 红色 评分配色) */
.trend-icon-wrap.up .trend-icon,
.trend-icon-wrap.up .trend-pct { color: #67C23A; }      /* 绿: Element UI success */
.trend-icon-wrap.down .trend-icon,
.trend-icon-wrap.down .trend-pct { color: #F56C6C; }    /* 红: Element UI danger */
.trend-icon-wrap.flat .trend-icon,
.trend-icon-wrap.flat .trend-pct { color: #909399; }    /* 灰: Element UI info */
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

/* 小屏适配 */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .bottom-row { grid-template-columns: 1fr; }
  .twocol-row { grid-template-columns: 1fr; }
}
</style>