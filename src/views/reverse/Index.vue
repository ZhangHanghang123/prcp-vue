<template>
  <div class="reverse-page">
    <el-tabs v-model="activeTab" type="border-card" class="reverse-tabs">
      <!-- ===== Tab 1：测算方案 ===== -->
      <el-tab-pane label="测算方案" name="schemes">
        <div class="toolbar">
          <el-button type="primary" icon="el-icon-plus" @click="openSchemeDialog()">新建方案</el-button>
          <el-input v-model="schemeFilter.keyword" placeholder="搜索方案编码/名称" clearable style="width:220px;margin-left:12px" @clear="loadSchemes" @keyup.enter.native="loadSchemes" />
          <el-select v-model="schemeFilter.status" placeholder="状态" clearable style="width:120px;margin-left:8px" @change="loadSchemes">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="运行中" value="RUNNING" />
            <el-option label="已完成" value="SUCCESS" />
            <el-option label="已停用" value="DISABLED" />
          </el-select>
        </div>
        <el-table :data="schemes" v-loading="loadingSchemes" border stripe height="calc(100vh - 320px)">
          <el-table-column prop="schemeCode" label="编码" width="180" />
          <el-table-column prop="schemeName" label="名称" min-width="200" />
          <el-table-column prop="coaName" label="关联账户册" width="200" show-overflow-tooltip />
          <el-table-column prop="modelName" label="计量模型" width="160" show-overflow-tooltip />
          <el-table-column prop="dataDate" label="数据日期" width="120">
            <template slot-scope="s">
              <el-tag size="mini" effect="plain">
                <i class="el-icon-date" style="margin-right:4px"></i>{{ s.row.dataDate || s.row.data_date || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="horizonMonths" label="预测期" width="90" />
          <el-table-column prop="runCount" label="运行数" width="80" />
          <el-table-column prop="status" label="状态" width="90">
            <template slot-scope="s">
              <el-tag :type="statusType(s.row.status)" size="mini">{{ s.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template slot-scope="s">
              <el-button size="mini" type="text" @click="viewScheme(s.row)">详情</el-button>
              <el-button size="mini" type="text" @click="goToTargetTab(s.row)">目标设置</el-button>
              <el-button size="mini" type="text" style="color:#0B6FF2" @click="runScheme(s.row)">运行</el-button>
              <el-button size="mini" type="text" style="color:#C9332B" @click="removeScheme(s.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ===== Tab 2：目标设置 ===== -->
      <el-tab-pane label="目标设置" name="targets">
        <div class="target-toolbar">
          <div class="target-toolbar-left">
            <el-select v-model="targetSchemeId" placeholder="选择测算方案" style="width:340px" @change="onTargetSchemeChange">
              <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} - ${s.schemeName}`" :value="s.id" />
            </el-select>
            <el-tag v-if="currentScheme" :type="statusType(currentScheme.status)" size="small" style="margin-left:12px">
              {{ currentScheme.status }}
            </el-tag>
            <span v-if="currentScheme" class="target-meta">{{ currentScheme.schemeName }} · {{ currentScheme.horizonMonths }} 月 · {{ currentScheme.modelName || '—' }}</span>
          </div>
          <div class="target-toolbar-right">
            <el-button icon="el-icon-plus" :disabled="!targetSchemeId" @click="openTargetDialog()">新增目标</el-button>
            <el-button icon="el-icon-refresh-left" :disabled="!targetSchemeId" @click="loadTargets">刷新</el-button>
            <el-button type="primary" icon="el-icon-position" :disabled="!targetSchemeId || targets.length === 0 || computing" :loading="computing" @click="onStartCalc">开始测算</el-button>
          </div>
        </div>

        <div v-if="!targetSchemeId" class="empty-tip">
          <i class="el-icon-info"></i> 请先选择测算方案，然后为目标 KPI 配置目标值、约束方式与权重。
        </div>
        <div v-else>
          <el-alert v-if="targets.length === 0 && !loadingTargets" type="warning" :closable="false" show-icon style="margin-bottom:12px">
            当前方案尚未配置目标。请点击右上角"新增目标"或前往「测算方案」创建新方案。
          </el-alert>
          <el-table :data="targets" v-loading="loadingTargets" border stripe size="small" height="calc(100vh - 320px)">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="targetName" label="目标名称" width="180" />
            <el-table-column prop="kpiCode" label="KPI 编码" width="140" />
            <el-table-column prop="targetValue" label="目标值" width="120" align="right">
              <template slot-scope="s">{{ Number(s.row.targetValue).toFixed(4) }}</template>
            </el-table-column>
            <el-table-column prop="constraintType" label="约束" width="100">
              <template slot-scope="s">
                <el-tag size="mini" :type="s.row.constraintType==='GE'?'success':(s.row.constraintType==='LE'?'warning':'info')">
                  {{ ({GE:'≥',LE:'≤',EQ:'='})[s.row.constraintType] || s.row.constraintType }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="权重" width="100" align="right">
              <template slot-scope="s">{{ Number(s.row.weight).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="horizonMonth" label="约束月" width="100" align="right" />
            <el-table-column prop="sortOrder" label="排序" width="80" align="right" />
            <el-table-column label="操作" width="160" fixed="right">
              <template slot-scope="s">
                <el-button size="mini" type="text" style="color:#0B6FF2" @click="openTargetDialog(s.row)">编辑</el-button>
                <el-button size="mini" type="text" style="color:#C9332B" @click="removeTarget(s.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- ===== Tab 3：测算结果 ===== -->
      <el-tab-pane label="测算结果" name="result">
        <DashboardPanels v-if="activeTab === 'result'" />
      </el-tab-pane>

      <!-- ===== Tab 4：运行记录（保留） ===== -->
      <el-tab-pane label="运行记录" name="runs">
        <el-table :data="runs" v-loading="loadingRuns" border stripe height="calc(100vh - 220px)">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="runCode" label="运行编码" width="200" />
          <el-table-column prop="schemeName" label="方案" min-width="180" />
          <el-table-column prop="status" label="状态" width="100">
            <template slot-scope="s">
              <el-tag :type="runStatusType(s.row.status)" size="mini">{{ s.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="progress" label="进度" width="180">
            <template slot-scope="s">
              <el-progress :percentage="Number(s.row.progress) || 0" :status="s.row.status === 'FAILED' ? 'exception' : ''" />
            </template>
          </el-table-column>
          <el-table-column prop="optimalValue" label="Optimal" width="120">
            <template slot-scope="s">{{ s.row.optimalValue == null ? '-' : Number(s.row.optimalValue).toFixed(4) }}</template>
          </el-table-column>
          <el-table-column prop="durationSec" label="耗时(s)" width="80" />
          <el-table-column prop="startAt" label="开始时间" width="160" />
          <el-table-column label="操作" width="240" fixed="right">
            <template slot-scope="s">
              <el-button size="mini" type="text" @click="viewLogs(s.row)">日志</el-button>
              <el-button size="mini" type="text" style="color:#0B6FF2" @click="viewResult(s.row)">结果</el-button>
              <el-button v-if="s.row.status==='RUNNING'||s.row.status==='PENDING'" size="mini" type="text" style="color:#F6903D" @click="cancelRun(s.row)">取消</el-button>
              <el-button size="mini" type="text" style="color:#C9332B" @click="removeRun(s.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 方案详情（只读） -->
    <el-dialog :title="`方案详情 - ${schemeDetail.scheme_name || ''}`" :visible.sync="detailDialog" width="680px">
      <el-descriptions v-if="schemeDetail.id" :column="2" border size="medium">
        <el-descriptions-item label="方案编码">{{ schemeDetail.scheme_code }}</el-descriptions-item>
        <el-descriptions-item label="方案名称">{{ schemeDetail.scheme_name }}</el-descriptions-item>
        <el-descriptions-item label="方案类型">{{ schemeDetail.scheme_type || 'OPTIMIZE' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="mini" :type="statusType(schemeDetail.status)">{{ schemeDetail.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关联账户册">{{ schemeDetail.coa_name || schemeDetail.coa_code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联模型">{{ schemeDetail.model_name || schemeDetail.model_code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据日期">{{ schemeDetail.data_date }}</el-descriptions-item>
        <el-descriptions-item label="预测期">{{ schemeDetail.horizon_months }} 月</el-descriptions-item>
        <el-descriptions-item label="算法">{{ algorithmLabel(schemeDetail.algorithm) }}</el-descriptions-item>
        <el-descriptions-item label="目标数">{{ schemeDetail.target_count }}</el-descriptions-item>
        <el-descriptions-item label="运行数">{{ schemeDetail.run_count }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ schemeDetail.created_at }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ schemeDetail.updated_at }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ schemeDetail.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      <div v-else style="text-align:center;padding:40px;color:#909399">加载中...</div>
      <span slot="footer">
        <el-button @click="detailDialog=false">关闭</el-button>
        <el-button type="primary" @click="editFromDetail">编辑此方案</el-button>
      </span>
    </el-dialog>

    <!-- 新建/编辑方案 -->
    <el-dialog :title="schemeForm.id ? '编辑方案' : '新建方案'" :visible.sync="schemeDialog" width="640px" @closed="resetSchemeForm">
      <el-form :model="schemeForm" label-width="120px" size="small">
        <el-form-item label="方案编码" required>
          <el-input v-model="schemeForm.scheme_code" :disabled="!!schemeForm.id" />
        </el-form-item>
        <el-form-item label="方案名称" required>
          <el-input v-model="schemeForm.scheme_name" />
        </el-form-item>
        <el-form-item label="关联账户册" required>
          <el-select v-model="schemeForm.coa_scheme_id" style="width:100%">
            <el-option v-for="c in coaSchemes" :key="c.id" :label="`${c.schemeCode} - ${c.schemeName}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联模型">
          <el-select v-model="schemeForm.model_id" clearable style="width:100%">
            <el-option v-for="m in modelOpts" :key="m.id" :label="`${m.modelCode} - ${m.modelName}`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据日期" required>
          <el-date-picker v-model="schemeForm.data_date" type="date" value-format="yyyy-MM-dd" style="width:100%" />
        </el-form-item>
        <el-form-item label="预测期">
          <el-input-number v-model="schemeForm.horizon_months" :min="1" :max="60" />
        </el-form-item>
        <el-form-item label="算法">
          <el-select v-model="schemeForm.algorithm" style="width:100%">
            <el-option v-for="a in algorithms" :key="a.code" :label="a.name" :value="a.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="schemeForm.status" style="width:100%">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="已启用" value="ACTIVE" />
            <el-option label="已停用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="schemeForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="schemeDialog=false">取消</el-button>
        <el-button type="primary" :loading="savingScheme" @click="saveScheme">保存</el-button>
      </span>
    </el-dialog>

    <!-- 新建/编辑目标 -->
    <el-dialog :title="targetForm.id ? '编辑目标' : '新增目标'" :visible.sync="targetInnerDialog" width="600px" @closed="resetTargetForm">
      <el-form :model="targetForm" label-width="100px" size="small">
        <el-form-item label="目标名称" required><el-input v-model="targetForm.target_name" /></el-form-item>
        <el-form-item label="KPI" required>
          <el-select v-model="targetForm.kpi_code" filterable style="width:100%">
            <el-option v-for="k in kpiOpts" :key="k.id" :label="`${k.kpiCode} - ${k.kpiName}`" :value="k.kpiCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标值" required><el-input-number v-model="targetForm.target_value" :precision="4" :step="0.1" /></el-form-item>
        <el-form-item label="约束类型">
          <el-radio-group v-model="targetForm.constraint_type">
            <el-radio-button label="GE">≥ 大于等于</el-radio-button>
            <el-radio-button label="LE">≤ 小于等于</el-radio-button>
            <el-radio-button label="EQ">= 等于</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="权重"><el-input-number v-model="targetForm.weight" :precision="2" :min="0" /></el-form-item>
        <el-form-item label="约束月"><el-input-number v-model="targetForm.horizon_month" :min="0" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="targetForm.sort_order" :min="0" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="targetForm.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="targetInnerDialog=false">取消</el-button>
        <el-button type="primary" :loading="savingTarget" @click="saveTarget">保存</el-button>
      </span>
    </el-dialog>

    <!-- 运行日志 -->
    <el-dialog :title="`运行日志 - ${currentRun && currentRun.runCode}`" :visible.sync="logDialog" width="780px">
      <el-table :data="logs" border size="mini" max-height="500">
        <el-table-column prop="id" label="#" width="60" />
        <el-table-column prop="logLevel" label="级别" width="80">
          <template slot-scope="s">
            <el-tag size="mini" :type="s.row.logLevel==='ERROR'?'danger':(s.row.logLevel==='WARN'?'warning':'info')">{{ s.row.logLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="80">
          <template slot-scope="s">{{ s.row.progress == null ? '-' : s.row.progress + '%' }}</template>
        </el-table-column>
        <el-table-column prop="logMessage" label="消息" />
        <el-table-column prop="createdAt" label="时间" width="160" />
      </el-table>
    </el-dialog>

    <!-- 运行结果 -->
    <el-dialog :title="`运行结果 - ${currentRun && currentRun.runCode}`" :visible.sync="resultDialog" width="1100px">
      <div v-if="currentResult">
        <el-row :gutter="12" style="margin-bottom:12px">
          <el-col :span="6"><el-statistic title="Optimal" :value="Number(currentResult.run.optimalValue || 0)" :precision="4" /></el-col>
          <el-col :span="6"><el-statistic title="耗时(s)" :value="currentResult.run.durationSec || 0" /></el-col>
          <el-col :span="6"><el-statistic title="预测月数" :value="currentResult.run.horizonMonths || 24" /></el-col>
          <el-col :span="6"><el-statistic title="结果行数" :value="currentResult.items.length" /></el-col>
        </el-row>
        <div style="margin-bottom:8px">
          <strong>KPI 达成情况：</strong>
          <el-tag v-for="(v,k) in kpiMap" :key="k" :type="v.constraint==='GE'?(v.actual>=v.target?'success':'danger'):(v.actual<=v.target?'success':'danger')" style="margin-right:8px">
            {{ k }}: {{ Number(v.actual).toFixed(2) }} / {{ v.constraint }} {{ v.target }} (调整={{ Number(v.adjust).toFixed(4) }})
          </el-tag>
        </div>
        <el-input v-model="resultFilter" placeholder="过滤节点编码" clearable style="width:200px;margin-bottom:8px" />
        <el-table :data="filteredResults" border size="mini" max-height="380">
          <el-table-column prop="predictMonth" label="月份" width="70" sortable />
          <el-table-column prop="predictDate" label="日期" width="100" />
          <el-table-column prop="rptItemCode" label="节点编码" width="120" />
          <el-table-column prop="currentValue" label="当前值" width="120">
            <template slot-scope="s">{{ Number(s.row.currentValue || 0).toLocaleString(undefined, {maximumFractionDigits:2}) }}</template>
          </el-table-column>
          <el-table-column prop="adjustedValue" label="调整后" width="120">
            <template slot-scope="s">{{ Number(s.row.adjustedValue || 0).toLocaleString(undefined, {maximumFractionDigits:2}) }}</template>
          </el-table-column>
          <el-table-column prop="deltaValue" label="变化" width="120">
            <template slot-scope="s">
              <span :style="{color: Number(s.row.deltaValue)>=0?'#67c23a':'#f56c6c'}">
                {{ Number(s.row.deltaValue || 0).toLocaleString(undefined, {maximumFractionDigits:2}) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { reverseApi } from '@/api/reverse'
import { coaApi } from '@/api/coa'
import DashboardPanels from './components/DashboardPanels.vue'

/**
 * @file 反算分析主入口
 * @desc 反算分析 (Reverse Calculation) 顶层页面。4 个 Tab:
 *         1) 测算方案 - 方案 CRUD (编码/名称/账户册/模型/算法/预测期/状态), 支持详情查看和运行
 *         2) 目标设置 - 当前方案下的目标列表 (KPI + 目标值 + 约束方式 GE/LE/EQ + 权重), 支持"开始测算"
 *         3) 测算结果 - 嵌入 <DashboardPanels> 子组件 (KPI 卡 + 趋势 + Top 节点 + 热力图)
 *         4) 运行记录 - 所有 run (PENDING/RUNNING/SUCCESS/FAILED/CANCELLED), 支持日志/结果/取消/删除
 *       支持通过 ?tab=result 直接进入结果驾驶舱 (来自侧边栏"结果驾驶舱"入口)。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /reverse/scheme?keyword=&status=                     - 方案分页
 *   GET    /reverse/scheme/{id}                                  - 方案详情
 *   POST   /reverse/scheme                                       - 新建方案
 *   PUT    /reverse/scheme/{id}                                  - 更新方案
 *   DELETE /reverse/scheme/{id}                                  - 删除方案
 *   GET    /reverse/scheme/options/model                         - 模型下拉
 *   GET    /reverse/scheme/options/kpi                           - KPI 下拉
 *   GET    /reverse/scheme/options/algorithm                     - 算法下拉
 *   GET    /reverse/target?schemeId=                             - 目标列表
 *   POST   /reverse/target                                       - 新建目标
 *   PUT    /reverse/target/{id}                                  - 更新目标
 *   DELETE /reverse/target/{id}                                  - 删除目标
 *   POST   /reverse/run                                          - 新建 run
 *   POST   /reverse/run/{id}/start                               - 启动 run
 *   POST   /reverse/run/{id}/cancel                              - 取消 run
 *   DELETE /reverse/run/{id}                                     - 删除 run
 *   GET    /reverse/run?limit=                                   - run 列表
 *   GET    /reverse/run/{id}/logs                                - run 日志
 *   GET    /reverse/run/{id}/result                              - run 结果
 *
 * 关联组件: DashboardPanels (./components/DashboardPanels.vue)
 * 关联路由: /reverse (group: 反算分析)
 */
export default {
  name: 'ReverseIndex',
  components: { DashboardPanels },
  data() {
    return {
      activeTab: 'schemes',
      // 方案
      schemes: [], loadingSchemes: false, schemeFilter: { keyword: '', status: '' },
      schemeDialog: false, savingScheme: false, schemeForm: this.newSchemeForm(),
      detailDialog: false, schemeDetail: {},
      coaSchemes: [], modelOpts: [], algorithms: [],
      // 目标设置（独立页签）
      targetSchemeId: null,
      currentScheme: null,
      targets: [], loadingTargets: false,
      targetInnerDialog: false, savingTarget: false, targetForm: this.newTargetForm(),
      kpiOpts: [],
      computing: false,
      // Run
      runs: [], loadingRuns: false,
      logDialog: false, currentRun: null, logs: [],
      resultDialog: false, currentResult: null, resultFilter: ''
    }
  },
  computed: {
    kpiMap() {
      try {
        if (!this.currentResult || !this.currentResult.metrics) return {}
        const m = JSON.parse(this.currentResult.metrics)
        return m.kpi_actual || {}
      } catch { return {} }
    },
    filteredResults() {
      if (!this.currentResult) return []
      const kw = (this.resultFilter || '').trim().toLowerCase()
      if (!kw) return this.currentResult.items.slice(0, 200)
      return this.currentResult.items.filter(i => (i.rptItemCode || '').toLowerCase().includes(kw)).slice(0, 200)
    }
  },
  watch: {
    activeTab(t) {
      // 切到目标设置或方案页时刷新方案列表；切换到结果页时 DashboardPanels 自身 mounted 已加载
      if (t === 'schemes' || t === 'targets') {
        this.loadSchemes()
      }
    },
    '$route.query.tab'(q) {
      if (q && ['schemes', 'targets', 'result', 'runs'].includes(q)) {
        this.activeTab = q
      }
    }
  },
  mounted() {
    // 支持通过 ?tab=result 直接进入结果驾驶舱（来自侧边栏"结果驾驶舱"入口）
    const qt = this.$route && this.$route.query && this.$route.query.tab
    if (qt && ['schemes', 'targets', 'result', 'runs'].includes(qt)) {
      this.activeTab = qt
    }
    this.loadSchemes()
    this.loadRuns()
    this.loadOptions()
  },
  methods: {
    /** 返回空的方案表单 (snake_case 字段) */
    newSchemeForm() { return { id: null, scheme_code: '', scheme_name: '', coa_scheme_id: null, model_id: null, data_date: '', horizon_months: 24, algorithm: 'HEURISTIC', status: 'DRAFT', description: '' } },
    /** 返回空的目标表单 */
    newTargetForm() { return { id: null, scheme_id: null, kpi_id: null, kpi_code: '', target_name: '', target_value: 0, constraint_type: 'GE', weight: 1.0, horizon_month: 0, sort_order: 0, description: '' } },
    /** 重置方案表单 (弹窗关闭时调用) */
    resetSchemeForm() { this.schemeForm = this.newSchemeForm() },
    /** 重置目标表单 */
    resetTargetForm() { this.targetForm = this.newTargetForm() },
    /**
     * <p>方案状态 → Element UI tag 类型</p>
     *
     * @param {string} s 状态 (DRAFT/RUNNING/SUCCESS/DISABLED/FAILED)
     * @returns {string} tag 类型
     */
    statusType(s) { return { DRAFT: 'info', RUNNING: 'warning', SUCCESS: 'success', DISABLED: 'danger', FAILED: 'danger' }[s] || '' },
    /**
     * <p>运行状态 → Element UI tag 类型</p>
     *
     * @param {string} s 状态 (PENDING/RUNNING/SUCCESS/CANCELLED/FAILED)
     * @returns {string} tag 类型
     */
    runStatusType(s) { return { PENDING: 'info', RUNNING: 'warning', SUCCESS: 'success', CANCELLED: 'danger', FAILED: 'danger' }[s] || '' },
    /**
     * <p>算法编码 → 中文名</p>
     *
     * @param {string} code 算法编码
     * @returns {string} 中文名
     */
    algorithmLabel(code) { return (this.algorithms.find(a => a.code === code) || {}).name || code },

    /** 加载 4 个下拉选项 (模型/KPI/算法/账户册方案) */
    async loadOptions() {
      try { const r = await reverseApi.modelOptions(); this.modelOpts = (r.data && r.data.items) || r.items || [] } catch (e) { console.warn('modelOptions failed', e) }
      try { const r = await reverseApi.kpiOptions();   this.kpiOpts   = (r.data && r.data.items) || r.items || [] } catch (e) { console.warn('kpiOptions failed', e) }
      try { const r = await reverseApi.listAlgorithms(); this.algorithms = (r.data && r.data.items) || r.items || [] } catch (e) { console.warn('algorithms failed', e) }
      try { const r = await coaApi.listSchemes(); this.coaSchemes = (r.data && r.data.items) || r.items || [] } catch (e) { console.warn('coaSchemes failed', e) }
    },

    /** 加载方案列表 (按 schemeFilter 过滤) */
    async loadSchemes() {
      this.loadingSchemes = true
      try {
        const r = await reverseApi.listSchemes(this.schemeFilter)
        this.schemes = (r.data && r.data.items) || r.items || []
      } catch (e) { this.$message.error('加载方案失败：' + (e.message || '')) }
      finally { this.loadingSchemes = false }
    },
    /** 加载运行列表 (limit=100) */
    async loadRuns() {
      this.loadingRuns = true
      try {
        const r = await reverseApi.listRuns({ limit: 100 })
        this.runs = (r.data && r.data.items) || r.items || []
      } catch (e) { this.$message.error('加载运行记录失败：' + (e.message || '')) }
      finally { this.loadingRuns = false }
    },

    /**
     * <p>打开新建/编辑方案弹窗</p>
     *
     * @param {Object} [row] 方案行, 不传则新建
     * @returns {void}
     */
    openSchemeDialog(row) {
      this.schemeForm = row ? { ...row, data_date: row.dataDate || row.data_date } : this.newSchemeForm()
      this.schemeDialog = true
    },
    /** 保存方案弹窗 (新增或更新) */
    async saveScheme() {
      this.savingScheme = true
      try {
        if (this.schemeForm.id) await reverseApi.updateScheme(this.schemeForm.id, this.schemeForm)
        else                    await reverseApi.createScheme(this.schemeForm)
        this.$message.success('保存成功')
        this.schemeDialog = false
        this.loadSchemes()
      } catch (e) { this.$message.error('保存失败：' + ((e.response && e.response.data && e.response.data.msg) || e.message)) }
      finally { this.savingScheme = false }
    },
    /**
     * <p>删除方案 (带 confirm)</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async removeScheme(row) {
      try { await this.$confirm(`确认删除方案 ${row.schemeName} ?`, '警告', { type: 'warning' }) } catch (e) { return }
      try { await reverseApi.deleteScheme(row.id); this.$message.success('已删除'); this.loadSchemes() }
      catch (e) { this.$message.error('删除失败：' + (e.message || '')) }
    },
    /**
     * <p>查看方案详情 (打开只读弹窗, 异步加载 detail)</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async viewScheme(row) {
      this.detailDialog = true
      this.schemeDetail = { id: row.id }
      try {
        const r = await reverseApi.getScheme(row.id)
        this.schemeDetail = (r.data && r.data.id !== undefined) ? r.data : (r.id !== undefined ? r : {})
      } catch (e) {
        this.$message.error('加载方案详情失败：' + (e.message || ''))
        this.detailDialog = false
      }
    },
    /** 从详情弹窗直接进入编辑模式 */
    editFromDetail() {
      this.detailDialog = false
      const d = this.schemeDetail || {}
      this.schemeForm = {
        id: d.id, scheme_code: d.scheme_code, scheme_name: d.scheme_name, scheme_type: d.scheme_type,
        coa_scheme_id: d.coa_scheme_id, model_id: d.model_id, data_date: d.data_date,
        horizon_months: d.horizon_months, algorithm: d.algorithm, status: d.status, description: d.description
      }
      this.schemeDialog = true
    },

    // ===== 目标设置（独立页签） =====
    /**
     * <p>从测算方案表格跳到目标设置 tab 并选中</p>
     *
     * @param {Object} row 方案行
     * @returns {void}
     */
    goToTargetTab(row) {
      // 从「测算方案」表格中点击「目标设置」按钮 → 切到目标设置 tab 并选中
      this.targetSchemeId = row.id
      this.activeTab = 'targets'
      this.loadTargets()
    },
    /**
     * <p>目标设置 tab 内切换当前方案</p>
     *
     * @param {number} id 方案 ID
     * @returns {void}
     */
    onTargetSchemeChange(id) {
      this.currentScheme = (this.schemes.find(s => s.id === id) || null)
      if (id) this.loadTargets()
      else    this.targets = []
    },
    /** 加载当前方案下的目标列表 */
    async loadTargets() {
      if (!this.targetSchemeId) { this.targets = []; return }
      this.loadingTargets = true
      try {
        const r = await reverseApi.listTargets({ schemeId: this.targetSchemeId })
        this.targets = (r.data && r.data.items) || r.items || []
        this.currentScheme = (this.schemes.find(s => s.id === this.targetSchemeId) || null)
      } catch (e) { this.$message.error('加载目标失败') }
      finally { this.loadingTargets = false }
    },
    /**
     * <p>打开新建/编辑目标弹窗</p>
     *
     * @param {Object} [row] 目标行, 不传则新建
     * @returns {void}
     */
    openTargetDialog(row) {
      this.targetForm = row
        ? { ...row }
        : { ...this.newTargetForm(), scheme_id: this.targetSchemeId, sort_order: this.targets.length }
      this.targetInnerDialog = true
    },
    /** 保存目标弹窗 (新增或更新) */
    async saveTarget() {
      this.savingTarget = true
      try {
        if (this.targetForm.id) await reverseApi.updateTarget(this.targetForm.id, this.targetForm)
        else                    await reverseApi.createTarget(this.targetForm)
        this.$message.success('保存成功')
        this.targetInnerDialog = false
        await this.loadTargets()
      } catch (e) { this.$message.error('保存失败：' + ((e.response && e.response.data && e.response.data.msg) || e.message)) }
      finally { this.savingTarget = false }
    },
    /**
     * <p>删除目标 (带 confirm)</p>
     *
     * @param {Object} row 目标行
     * @returns {Promise<void>}
     */
    async removeTarget(row) {
      try { await this.$confirm('确认删除该目标?', '警告', { type: 'warning' }) } catch (e) { return }
      try { await reverseApi.deleteTarget(row.id); this.$message.success('已删除'); await this.loadTargets() }
      catch (e) { this.$message.error('删除失败') }
    },

    // ===== 开始测算 =====
    /**
     * <p>为当前方案发起测算 (创建 run + 启动 run, 跳到结果 tab)</p>
     *
     * @returns {Promise<void>}
     */
    async onStartCalc() {
      if (!this.currentScheme) return
      if (this.targets.length === 0) {
        this.$message.warning('当前方案还没有目标，请先配置目标')
        return
      }
      try {
        await this.$confirm(`确认对方案「${this.currentScheme.schemeName}」发起测算？\n配置目标数：${this.targets.length}`, '开始测算', { type: 'info' })
      } catch (e) { return }
      this.computing = true
      try {
        const r = await reverseApi.createRun({ scheme_id: this.currentScheme.id, description: `由目标设置触发：${this.currentScheme.schemeName}` })
        const run = (r.data && r.data.id) ? r.data : r
        await reverseApi.startRun(run.id)
        this.$message.success(`已启动 run #${run.id}，请到"运行记录"查看进度`)
        await this.loadRuns()
        // 跳到测算结果页签
        this.activeTab = 'result'
      } catch (e) { this.$message.error('测算启动失败：' + (e.message || '')) }
      finally { this.computing = false }
    },

    // ===== 运行记录 =====
    /**
     * <p>为方案直接运行 (绕过目标设置, 跳到运行记录 tab)</p>
     *
     * <p>当前流程 (进程内): createRun → startRun → 后端 EXEC 线程池同步求解</p>
     * <p>改造目标 (外部引擎): createRun → 后端组装报文 POST 到独立引擎服务 → 引擎异步回调结果</p>
     * <p>详见后端接口文档: {@code docs/api/reverse-engine-api.md}</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async runScheme(row) {
      try {
        const r = await reverseApi.createRun({ scheme_id: row.id, description: `由 ${row.schemeName} 触发` })
        const run = (r.data && r.data.id) ? r.data : r
        await reverseApi.startRun(run.id)
        this.$message.success(`已启动 run #${run.id}，请到"运行记录"查看进度`)
        this.loadRuns()
        this.activeTab = 'runs'
      } catch (e) { this.$message.error('运行失败：' + (e.message || '')) }
    },
    /**
     * <p>取消运行 (PENDING/RUNNING 状态)</p>
     *
     * @param {Object} row 运行行
     * @returns {Promise<void>}
     */
    async cancelRun(row) {
      try { await reverseApi.cancelRun(row.id); this.$message.success('已取消'); this.loadRuns() }
      catch (e) { this.$message.error('取消失败') }
    },
    /**
     * <p>删除运行 (带 confirm, 会级联删除结果数据)</p>
     *
     * @param {Object} row 运行行
     * @returns {Promise<void>}
     */
    async removeRun(row) {
      try { await this.$confirm('确认删除该运行记录?结果数据也会被删除', '警告', { type: 'warning' }) } catch (e) { return }
      try { await reverseApi.deleteRun(row.id); this.$message.success('已删除'); this.loadRuns() }
      catch (e) { this.$message.error('删除失败') }
    },
    /**
     * <p>查看运行日志弹窗</p>
     *
     * @param {Object} row 运行行
     * @returns {Promise<void>}
     */
    async viewLogs(row) {
      this.currentRun = row
      this.logDialog = true
      try {
        const r = await reverseApi.runLogs(row.id, 0)
        this.logs = (r.data && r.data.items) || r.items || []
      } catch (e) { this.$message.error('加载日志失败') }
    },
    /**
     * <p>查看运行结果弹窗 (Optimal + 耗时 + KPI 达成 + 明细行)</p>
     *
     * @param {Object} row 运行行
     * @returns {Promise<void>}
     */
    async viewResult(row) {
      this.currentRun = row
      this.resultDialog = true
      this.currentResult = null
      try {
        const r = await reverseApi.runResult(row.id)
        this.currentResult = r.data || r
      } catch (e) { this.$message.error('加载结果失败') }
    }
  }
}
</script>

<style scoped>
.reverse-page { padding: 12px; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.el-statistic >>> .el-statistic__content { font-size: 18px; }

/* ===== 目标设置工具栏 ===== */
.target-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.target-toolbar-left { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.target-toolbar-right { display: flex; align-items: center; gap: 8px; }
.target-meta {
  margin-left: 12px;
  font-size: 13px;
  color: var(--text-muted);
}
.empty-tip {
  padding: 60px 24px;
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-card);
  border-radius: var(--radius-card);
  border: 1px dashed var(--border-color-2);
}
.empty-tip i { font-size: 22px; margin-right: 6px; color: var(--brand-primary); }
</style>