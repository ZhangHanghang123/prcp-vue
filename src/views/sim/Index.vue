<template>
  <div class="sim-page">
    <div class="page-header">
      <h2>🎮 新业务模拟方案</h2>
      <p class="desc">
        账户册方案 × 月度新业务增长 × 期限占比 × 利率 → 引擎滚动出 64 桶结果
      </p>
    </div>

    <el-card class="filter-card">
      <el-row :gutter="16" type="flex" align="middle">
        <el-col :span="5">
          <el-select v-model="filter.coaSchemeId" placeholder="账户册方案" clearable filterable @change="loadSchemes">
            <el-option v-for="s in coaSchemes" :key="s.id"
                       :label="`${s.scheme_code} | ${s.scheme_name}`" :value="s.id" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filter.status" placeholder="状态" clearable @change="loadSchemes">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input v-model="filter.keyword" placeholder="方案编码/名称" clearable
                    @keyup.enter.native="loadSchemes" />
        </el-col>
        <el-col :span="8">
          <el-button icon="el-icon-search" @click="loadSchemes">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
          <el-button type="primary" icon="el-icon-plus" @click="onAddScheme">新增方案</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card" v-loading="loading.list" style="margin-top:16px">
      <el-table :data="schemes" border stripe>
        <el-table-column prop="schemeCode" label="方案编码" width="160" />
        <el-table-column prop="schemeName" label="方案名称" />
        <el-table-column label="关联账户册" width="200">
          <template #default="{ row }">
            <el-tag size="mini" type="info">{{ row.coaSchemeCode }}</el-tag>
            <span style="margin-left:6px">{{ row.coaSchemeName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="dataDate" label="起始日期" width="120" align="center" />
        <el-table-column prop="configNodeCount" label="已配节点" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="mini" :type="row.configNodeCount > 0 ? 'success' : 'warning'">
              {{ row.configNodeCount || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="mini"
                    @click="onToggleStatus(row)" style="cursor:pointer">
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center">
          <template #default="{ row }">
            <el-button type="text" size="mini" @click="onConfig(row)">⚙️ 配置节点</el-button>
            <el-button type="text" size="mini" @click="onEdit(row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 节点配置抽屉 (对齐 Python SimConfigPage: 5 大区域) -->
    <el-drawer title="节点参数配置" :visible.sync="configDrawerVisible" direction="rtl" size="92%" :wrapper-closable="false">
      <div v-if="configScheme" class="cfg-drawer-body">
        <!-- 顶部：面包屑 + 方案信息 -->
        <div class="cfg-topbar">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/sim' }">← 返回方案列表</el-breadcrumb-item>
            <el-breadcrumb-item>参数配置</el-breadcrumb-item>
            <el-breadcrumb-item>
              <el-tag size="mini" type="primary">{{ configScheme.schemeCode }}</el-tag>
              {{ configScheme.schemeName }}
            </el-breadcrumb-item>
            <el-breadcrumb-item>账户册方案：{{ configScheme.coaSchemeCode }}</el-breadcrumb-item>
            <el-breadcrumb-item>基准日：{{ configScheme.dataDate }}</el-breadcrumb-item>
            <el-breadcrumb-item>
              <el-tag size="mini" type="success">已配置 {{ configuredCount }} 个</el-tag>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="config-layout">
          <!-- 左：账户册节点树 (完整展开 + 已配置标绿) -->
          <div class="left-tree">
            <el-input v-model="treeKw" placeholder="搜索节点编码/名称" size="small" clearable>
              <el-button slot="append" icon="el-icon-search" />
            </el-input>
            <el-tree
              ref="treeRef"
              :data="filteredTree"
              node-key="id"
              :props="{ label: 'title', children: 'children' }"
              :default-expanded-keys="expandedTreeKeys"
              :filter-node-method="filterTreeNode"
              highlight-current
              :expand-on-click-node="false"
              @node-click="onTreeClick"
              class="cfg-tree"
            >
              <span class="custom-tree-node" slot-scope="{ node, data }">
                <span :class="data.has_config ? 'tree-node-cfg' : ''">{{ node.label }}</span>
                <el-tag v-if="data.has_config" size="mini" type="success" effect="plain" class="tree-cfg-tag">已配置</el-tag>
              </span>
            </el-tree>
            <div class="tree-legend">
              <el-tag size="mini" type="success" effect="plain">已配置</el-tag> 该节点在此方案下已有参数配置
            </div>
          </div>

          <!-- 右：配置表单 (5 大区域) -->
          <div class="right-form">
            <div v-if="!selectedNode" class="empty-tip">
              <i class="el-icon-arrow-left"></i> 请在左侧选择一个节点
            </div>
            <div v-else>
              <!-- 区域 1: 节点基础信息 -->
              <div class="cfg-panel">
                <div class="cfg-panel-title">
                  <i class="el-icon-info"></i> 节点基础信息
                  <el-tag v-if="selectedNode.has_config" size="mini" type="success" class="panel-tag">{{ selectedNode.code }}</el-tag>
                </div>
                <el-descriptions :column="5" border size="small">
                  <el-descriptions-item label="节点编码">{{ selectedNode.code || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="节点名称">{{ selectedNode.name || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="节点类型">{{ selectedNode.type || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="节点层级">L{{ selectedNode.level || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="当前余额(元)">
                    <span v-if="selectedNode.current_balance_amount != null">
                      {{ Number(selectedNode.current_balance_amount).toFixed(2) }}
                    </span>
                    <span v-else>0.00</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <!-- 区域 2: 是否模型测算 -->
              <div class="cfg-panel cfg-panel-hl">
                <div class="cfg-panel-title">
                  <i class="el-icon-question"></i> 是否模型测算
                </div>
                <el-form :model="cfgForm" label-width="90px" size="small" style="margin-bottom:0">
                  <el-form-item label="模型测算">
                    <el-select v-model="cfgForm.is_model_calc" style="width:200px">
                      <el-option label="是" :value="1" />
                      <el-option label="否" :value="2" />
                    </el-select>
                    <span class="cfg-hint">
                      <i class="el-icon-warning-outline"></i>
                      当前节点: {{ selectedNode.code }},
                      该节点进入新业务模型的余额指标【查看 prcp_sim_result 快照】
                    </span>
                  </el-form-item>
                </el-form>
              </div>

              <!-- 区域 3: 上栏 · 新业务增长配置 -->
              <div class="cfg-panel cfg-panel-growth">
                <div class="cfg-panel-title">
                  <i class="el-icon-top"></i> 上栏 · 新业务增长配置
                  <span class="panel-actions">
                    <el-button size="mini" type="text" @click="fillYearFromFirst">用第 1 年等差填充</el-button>
                    <el-button size="mini" type="text" icon="el-icon-refresh" @click="onResetGrowth">清空</el-button>
                    <el-button size="mini" type="text" icon="el-icon-document-checked" @click="onSaveGrowth">保存增长</el-button>
                  </span>
                </div>
                <el-form :model="growthForm" label-width="120px" size="small">
                  <el-form-item label="拉照增长百分比">
                    <el-select v-model="growthForm.growth_type" style="width:280px">
                      <el-option label="目标增长百分比" :value="1" />
                      <el-option label="目标增长绝对值" :value="2" />
                      <el-option label="增长百分比" :value="3" />
                      <el-option label="增长值" :value="4" />
                    </el-select>
                    <span class="cfg-hint">
                      目标增长参数 = 基数 × 增速% ·
                      <template v-if="growthForm.growth_type === 1 || growthForm.growth_type === 3">单位 %</template>
                      <template v-else>
                        单位 金额
                        <el-select v-model="growthForm.amount_unit" size="mini" style="width:90px;margin-left:4px">
                          <el-option label="万元" value="WAN" />
                          <el-option label="亿元" value="YI" />
                        </el-select>
                      </template>
                    </span>
                  </el-form-item>
                </el-form>
                <el-row :gutter="8" style="margin-bottom:6px">
                  <el-col v-for="y in 5" :key="y" :span="4">
                    <div class="year-label">第 {{ y }} 年</div>
                    <el-input-number
                      v-model="growthForm['year' + y + '_value']"
                      :precision="4" :step="1" size="mini" controls-position="right" style="width:100%" />
                    <div class="year-unit">%</div>
                  </el-col>
                </el-row>
                <el-alert type="info" :closable="false" show-icon>
                  <template slot="title">
                    年度收入 &amp; 余额表: 增速 6.3333% (线性) ·
                    {{ growthTypeDesc }}
                  </template>
                </el-alert>
              </div>

              <!-- 区域 4: 中栏 · 新业务期限占比 -->
              <div class="cfg-panel cfg-panel-ratio">
                <div class="cfg-panel-title">
                  <i class="el-icon-s-operation"></i> 中栏 · 新业务期限占比
                  <el-tag size="mini" :type="totalRatioValid ? 'success' : 'danger'" class="panel-tag">
                    业务占比校验{{ totalRatioValid ? '通过' : '失败' }}: 所有占比之和为 100%
                  </el-tag>
                </div>
                <div class="ratio-toolbar">
                  <el-tag size="small" :type="totalRatioValid ? 'success' : 'danger'">
                    占比之和 = {{ totalRatio.toFixed(4) }}%
                  </el-tag>
                  <el-button size="mini" type="text" icon="el-icon-plus" @click="addRatioRow">+ 添加行</el-button>
                </div>
                <el-table :data="cfgForm.ratios" border size="small" style="width:100%">
                  <el-table-column label="序号" width="55" align="center" type="index" />
                  <el-table-column label="期限值" width="130">
                    <template #default="{ row }">
                      <el-input-number v-model="row.term_value" :min="1" :max="60" :step="1" size="mini" controls-position="right" style="width:100%" />
                    </template>
                  </el-table-column>
                  <el-table-column label="期限单位" width="90" align="center">
                    <template #default>
                      <el-tag size="mini" effect="plain">固定</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="业务占比(%)" width="140">
                    <template #default="{ row }">
                      <el-input-number v-model="row.business_ratio" :min="0" :max="100" :precision="2" :step="1" size="mini" controls-position="right" style="width:100%" />
                    </template>
                  </el-table-column>
                  <el-table-column label="新业务利率(%)" width="140">
                    <template #default="{ row }">
                      <el-input-number v-model="row.interest_rate" :min="0" :max="100" :precision="4" :step="0.01" size="mini" controls-position="right" style="width:100%" />
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="70" align="center">
                    <template #default="{ $index }">
                      <el-button type="text" size="mini" style="color:#f56c6c" @click="removeRatioRow($index)">删除</el-button>
                    </template>
                  </el-table-column>
                  <el-table-column slot="footer">
                    <template slot-scope="scope">
                      <span>共 {{ (scope.row || []).length }} 行</span>
                      <span style="margin-left:12px">占比之和: {{ totalRatio.toFixed(4) }}% / 100%</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 区域 5: 下栏 · 新业务节奏配置 -->
              <div class="cfg-panel cfg-panel-rhythm">
                <div class="cfg-panel-title">
                  <i class="el-icon-bottom"></i> 下栏 · 新业务节奏配置
                  <span class="panel-actions">
                    <el-tag size="mini" type="success" effect="plain">12 月线性分配</el-tag>
                    <el-button size="mini" type="text" icon="el-icon-refresh" @click="onResetRhythm">12 月线性分配</el-button>
                    <el-button size="mini" type="text" icon="el-icon-document-checked" @click="onSaveRhythm">保存节奏</el-button>
                  </span>
                </div>
                <el-form :model="cfgForm" label-width="90px" size="small">
                  <el-form-item label="权重">
                    <el-select v-model="cfgForm.rhythm_type" style="width:200px">
                      <el-option label="线性" :value="1" />
                      <el-option label="自定义" :value="2" />
                    </el-select>
                    <span class="cfg-hint">
                      当前为 12 项线性分配, 每月权重 = 8.3333%
                    </span>
                  </el-form-item>
                </el-form>
                <el-table :data="rhythmForm.weights" border size="mini" style="width:100%">
                  <el-table-column label="月份" width="70" align="center">
                    <template #default="{ row }">{{ row.month_label || (row.month_no + '月') }}</template>
                  </el-table-column>
                  <el-table-column label="说明" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.month_no ? '第 ' + row.month_no + ' 个月' : '—' }}</template>
                  </el-table-column>
                  <el-table-column label="权重(%)">
                    <template #default="{ row }">
                      <el-input-number v-model="row.weight" :min="0" :max="100" :precision="4" :step="0.5" size="mini" controls-position="right" style="width:140px" />
                    </template>
                  </el-table-column>
                  <el-table-column label="备注">
                    <template #default="{ row }">
                      <el-input v-model="row.remark" size="mini" placeholder="可选" />
                    </template>
                  </el-table-column>
                </el-table>
                <div class="rhythm-total">
                  权重合计: <b>{{ rhythmTotal.toFixed(4) }}%</b>
                  <span v-if="!rhythmTotalValid" style="color:#f56c6c;margin-left:10px">✗ 必须 = 100%</span>
                </div>
              </div>

              <!-- 底部操作条 -->
              <div class="cfg-footer">
                <el-button type="primary" @click="onSaveCfg" :loading="submitting">💾 保存</el-button>
                <el-button v-if="existingCfgId" type="danger" plain @click="onDeleteCfg">删除配置</el-button>
                <el-button @click="configDrawerVisible = false">关闭</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 新增/编辑方案弹窗 -->
    <el-dialog :title="editing ? '编辑方案' : '新增方案'" :visible.sync="modalVisible" width="560px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="方案编码" prop="scheme_code">
          <el-input v-model="form.scheme_code" :disabled="!!editing" />
        </el-form-item>
        <el-form-item label="方案名称" prop="scheme_name">
          <el-input v-model="form.scheme_name" />
        </el-form-item>
        <el-form-item label="关联账户册方案" prop="coa_scheme_id">
          <el-select v-model="form.coa_scheme_id" :disabled="!!editing" filterable style="width:100%">
            <el-option v-for="s in coaSchemes" :key="s.id"
                       :label="`${s.scheme_code} | ${s.scheme_name}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="起始月" prop="data_date">
          <el-date-picker v-model="form.data_date" type="month" value-format="yyyy-MM-dd"
                          :disabled="!!editing" placeholder="选择模拟起始月" style="width:100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:120px">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modalVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { simApi } from '@/api/sim'

/**
 * @file 新业务模拟方案
 * @desc 新业务增长模拟: 账户册方案 × 月度新业务增长 × 期限占比 × 利率 → 引擎滚动出 64 桶结果。
 *       布局: 顶部筛选 (账户册方案/状态/关键字) + 方案列表 + 节点配置抽屉 (左节点树 + 右配置表单) + 方案增改弹窗。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /sim/scheme?keyword=&status=&coa_scheme_id=        - 方案列表 (含 configNodeCount)
 *   POST   /sim/scheme                                        - 新建方案
 *   PUT    /sim/scheme/{id}                                   - 更新方案
 *   DELETE /sim/scheme/{id}                                   - 删除方案
 *   POST   /sim/scheme/{id}/toggle-status                     - 切换 ACTIVE/INACTIVE
 *   GET    /sim/coa-scheme                                    - 账户册方案下拉
 *   GET    /sim/coa-tree/{coaSchemeId}                        - 账户册节点树
 *   GET    /sim/node-info/{nodeId}                            - 节点详情
 *   GET    /sim/node-config/{schemeId}/{nodeId}                - 节点配置
 *   POST   /sim/node-config/{schemeId}                        - 保存节点配置
 *   DELETE /sim/node-config/{configId}                        - 删除节点配置
 *
 * 关联组件: 无
 * 关联路由: /sim (group: 引擎建模)
 */
export default {
  name: 'Sim',
  data() {
    return {
      filter: { coaSchemeId: null, status: '', keyword: '' },
      schemes: [],
      coaSchemes: [],
      loading: { list: false },
      modalVisible: false,
      editing: false,
      editingId: null,
      form: { scheme_code: '', scheme_name: '', coa_scheme_id: null, data_date: '', status: 'ACTIVE', description: '' },
      rules: {
        scheme_code: [{ required: true, message: '请输入方案编码', trigger: 'blur' }],
        scheme_name: [{ required: true, message: '请输入方案名称', trigger: 'blur' }],
        coa_scheme_id: [{ required: true, message: '请选择账户册方案', trigger: 'change' }],
        data_date: [{ required: true, message: '请选择起始月', trigger: 'change' }]
      },
      submitting: false,
      configDrawerVisible: false,
      configScheme: null,
      treeKw: '',
      treeData: [],
      /** 🆕 v2.4: 树的默认展开键 (已配置节点 + 全部一级) */
      expandedTreeKeys: [],
      selectedNode: null,
      /** 节点配置表单 (v2.4: 年化增长率 + 期限单位 + 是否模型测算 + 节奏类型 + 期限占比子表) */
      cfgForm: {
        annual_growth_rate: 5.0,
        term_unit: 'MONTH',
        is_model_calc: 1,
        rhythm_type: 1,
        ratios: []
      },
      /** 🆕 v2.1: 新业务增长配置表单 (增长方式 + 5 年参数) */
      growthForm: {
        growth_type: 1,
        year1_value: 0, year2_value: 0, year3_value: 0, year4_value: 0, year5_value: 0,
        amount_unit: 'WAN',
        remark: ''
      },
      /** 🆕 v2.1: 12 个月节奏权重表单 */
      rhythmForm: { weights: [] },
      existingCfgId: null,
      configuredCount: 0
    }
  },
  computed: {
    filteredTree() {
      const kw = (this.treeKw || '').toLowerCase().trim()
      if (!kw) return this.treeData
      const filterFn = (n) => {
        const hit = (n.code || '').toLowerCase().includes(kw) || (n.name || '').toLowerCase().includes(kw)
        if (n.children && n.children.length) {
          const cs = n.children.map(filterFn).filter(Boolean)
          if (cs.length) { n.children = cs; return true }
        }
        return hit
      }
      return this.treeData.map(filterFn).filter(Boolean)
    },
    totalRatio() {
      return (this.cfgForm.ratios || []).reduce((s, r) => s + (Number(r.business_ratio) || 0), 0)
    },
    totalRatioValid() {
      return Math.abs(this.totalRatio - 100) < 0.01
    },
    /** 🆕 12 月节奏权重合计 */
    rhythmTotal() {
      return (this.rhythmForm.weights || []).reduce((s, r) => s + (Number(r.weight) || 0), 0)
    },
    rhythmTotalValid() {
      return Math.abs(this.rhythmTotal - 100) < 0.1
    },
    /** 🆕 增长方式说明文案 */
    growthTypeDesc() {
      const map = {
        1: '目标增长百分比 — 当年增量 = 基数 × 增速%, 到期回补',
        2: '目标增长绝对值 — 当年增量 = 参数 × 单位换算, 到期回补',
        3: '增长百分比 — 当年增量 = 基数 × 增速%, 到期自然出表',
        4: '增长值 — 当年增量 = 年末目标余额 − 年初余额, 可为负'
      }
      return map[this.growthForm.growth_type] || ''
    }
  },
  methods: {
    /** 按当前筛选条件加载方案列表 */
    async loadSchemes() {
      this.loading.list = true
      try {
        const res = await simApi.listSchemes({
          keyword: this.filter.keyword || undefined,
          status: this.filter.status || undefined,
          // Java 后端形参是 coaSchemeId (Spring @RequestParam 默认取形参名), 不能用 snake_case
          coaSchemeId: this.filter.coaSchemeId || undefined
        })
        this.schemes = (res && res.items) || []
      } finally {
        this.loading.list = false
      }
    },
    /** 加载账户册方案下拉 */
    async loadCoaSchemes() {
      const res = await simApi.coaSchemes()
      this.coaSchemes = (res && res.items) || []
    },
    /** 重置筛选条件 + 重新加载 */
    onReset() {
      this.filter = { coaSchemeId: null, status: '', keyword: '' }
      this.loadSchemes()
    },
    /** 打开新增方案弹窗 */
    onAddScheme() {
      this.editing = false
      this.editingId = null
      this.form = { scheme_code: '', scheme_name: '', coa_scheme_id: null, data_date: '', status: 'ACTIVE', description: '' }
      this.modalVisible = true
    },
    /**
     * <p>打开编辑方案弹窗, 用行数据回填</p>
     *
     * @param {Object} row 方案行
     * @returns {void}
     */
    onEdit(row) {
      this.editing = true
      this.editingId = row.id
      this.form = {
        scheme_code: row.schemeCode,
        scheme_name: row.schemeName,
        coa_scheme_id: row.coaSchemeId,
        data_date: row.dataDate,
        status: row.status,
        description: row.description
      }
      this.modalVisible = true
    },
    /** 提交方案弹窗 (新增或更新), 带表单校验 */
    async onSubmit() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.editing) {
            await simApi.updateScheme(this.editingId, this.form)
          } else {
            await simApi.createScheme(this.form)
          }
          this.$message.success(this.editing ? '已更新' : '已创建')
          this.modalVisible = false
          this.loadSchemes()
        } catch (e) {
          this.$message.error('提交失败：' + (e.message || ''))
        } finally {
          this.submitting = false
        }
      })
    },
    /**
     * <p>切换 ACTIVE/INACTIVE 状态</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async onToggleStatus(row) {
      const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await simApi.toggleStatus(row.id, next)
      this.$message.success('已切换为 ' + next)
      this.loadSchemes()
    },
    /**
     * <p>删除方案 (级联软删所有节点配置, 带 confirm)</p>
     *
     * @param {Object} row 方案行
     * @returns {void}
     */
    onDelete(row) {
      this.$confirm(`确定删除方案「${row.schemeName}」？会级联软删其下所有节点配置和期限占比。`, '提示', { type: 'warning' }).then(async () => {
        await simApi.removeScheme(row.id)
        this.$message.success('已删除')
        this.loadSchemes()
      }).catch(() => {})
    },
    /**
     * <p>打开节点配置抽屉, 加载账户册节点树 (带「已配置」标记)</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async onConfig(row) {
      this.configScheme = row
      this.configDrawerVisible = true
      this.treeKw = ''
      this.selectedNode = null
      // 注意: request.js 响应拦截器已把 R<T> 解包为 T, 此处不能再取 .data
      // 传 sim_scheme_id → 后端给每个节点标 has_config (已配置标绿)
      const treeRes = await simApi.coaTree(row.coaSchemeId, row.id)
      this.treeData = (treeRes && treeRes.items) || []
      this.configuredCount = row.configNodeCount || 0
      // 🆕 默认展开: 全部一级节点 + 全部已配置节点
      const keys = []
      const walk = (nodes, depth) => {
        nodes.forEach(n => {
          if (depth === 0 || n.has_config) keys.push(n.id)
          if (n.children && n.children.length) walk(n.children, depth + 1)
        })
      }
      walk(this.treeData, 0)
      this.expandedTreeKeys = keys
    },
    /**
     * <p>el-tree 节点过滤方法 (按编码/名称)</p>
     *
     * @param {string} value 搜索关键字
     * @param {Object} data 节点数据
     * @returns {boolean} 是否显示
     */
    filterTreeNode(value, data) {
      if (!value) return true
      return (data.code || '').toLowerCase().includes(value.toLowerCase()) ||
             (data.name || '').toLowerCase().includes(value.toLowerCase())
    },
    /**
     * <p>点击节点树 — 加载节点详情 + 全部配置 (期限占比 / 增长配置 / 节奏配置)</p>
     *
     * @param {Object} node 节点对象
     * @returns {Promise<void>}
     */
    async onTreeClick(node) {
      // 注意: request.js 响应拦截器已解包, 此处不能再取 .data
      this.selectedNode = { ...(node.data || node), has_config: !!(node.data || node).has_config }
      const d = await simApi.getNodeConfig(this.configScheme.id, node.id)
      this.existingCfgId = d && d.exists ? d.config.id : null

      if (d && d.exists) {
        const c = d.config
        this.cfgForm = {
          annual_growth_rate: Number(c.annualGrowthRate) || 0,
          term_unit: c.termUnit || 'MONTH',
          is_model_calc: Number(c.isModelCalc) || 2,
          rhythm_type: Number(c.rhythmType) || 1,
          ratios: (d.ratios || []).map(r => ({
            term_value: r.termValue,
            business_ratio: Number(r.businessRatio),
            interest_rate: Number(r.interestRate) || 0
          }))
        }
      } else {
        this.cfgForm = {
          annual_growth_rate: 5.0,
          term_unit: 'MONTH',
          is_model_calc: 1,
          rhythm_type: 1,
          ratios: []
        }
      }

      // 🆕 增长配置
      const g = (d && d.growth) || {}
      this.growthForm = {
        growth_type: Number(g.growth_type) || 1,
        year1_value: Number(g.year1_value) || 0,
        year2_value: Number(g.year2_value) || 0,
        year3_value: Number(g.year3_value) || 0,
        year4_value: Number(g.year4_value) || 0,
        year5_value: Number(g.year5_value) || 0,
        amount_unit: g.amount_unit || 'WAN',
        remark: g.remark || ''
      }

      // 🆕 节奏配置 (12 月权重) — 归一化 camelCase / snake_case
      this.rhythmForm = { weights: this.normalizeRhythm(d && d.rhythm) }
      if (!this.rhythmForm.weights.length) {
        for (let m = 1; m <= 12; m++) {
          this.rhythmForm.weights.push({
            month_no: m, month_label: m + '月', weight: 8.3333, remark: '默认线性（12 个月均匀）'
          })
        }
      }
    },
    /**
     * <p>归一化 12 月节奏权重 (兼容 camelCase / snake_case 两种字段名)</p>
     *
     * <p>⚠️ 后端字段名不统一:
     * <ul>
     *   <li>Python 原系统: {@code month_no} / {@code month_label} (snake_case)</li>
     *   <li>Java 版: {@code monthNo} / {@code monthLabel} (camelCase, MyBatis AS 别名)</li>
     * </ul>
     * 直接读 {@code row.month_label} 会出现「undefined 月」。此处统一转成 snake_case。</p>
     *
     * @param {Array} rows 原始权重行
     * @returns {Array} 归一化后的权重行 [{month_no, month_label, weight, remark}]
     */
    normalizeRhythm(rows) {
      if (!Array.isArray(rows)) return []
      return rows.map((r, i) => {
        const monthNo = r.month_no != null ? r.month_no : (r.monthNo != null ? r.monthNo : i + 1)
        return {
          month_no: Number(monthNo),
          month_label: r.month_label || r.monthLabel || (Number(monthNo) + '月'),
          weight: Number(r.weight) || 0,
          remark: r.remark || ''
        }
      })
    },
    /** 在 cfgForm.ratios 末尾追加一行空比率 */
    addRatioRow() {
      this.cfgForm.ratios.push({ term_value: 12, business_ratio: 0, interest_rate: 0 })
    },
    /**
     * <p>删除 cfgForm.ratios 指定索引行</p>
     *
     * @param {number} i 行索引
     * @returns {void}
     */
    removeRatioRow(i) {
      this.cfgForm.ratios.splice(i, 1)
    },
    /**
     * <p>🆕 用第 1 年等差填充 5 年参数 (对齐 Python SimConfigPage)</p>
     *
     * @returns {void}
     */
    fillYearFromFirst() {
      const y1 = Number(this.growthForm.year1_value) || 0
      for (let y = 2; y <= 5; y++) {
        this.growthForm['year' + y + '_value'] = y1
      }
      this.$message.success('已用第 1 年填充 5 年参数')
    },
    /**
     * <p>🆕 清空增长配置</p>
     *
     * @returns {void}
     */
    onResetGrowth() {
      this.growthForm = {
        growth_type: 1,
        year1_value: 0, year2_value: 0, year3_value: 0, year4_value: 0, year5_value: 0,
        amount_unit: 'WAN',
        remark: ''
      }
    },
    /**
     * <p>🆕 保存增长配置 (需先有节点配置)</p>
     *
     * @returns {Promise<void>}
     */
    async onSaveGrowth() {
      if (!this.existingCfgId) {
        this.$message.warning('请先保存节点配置, 再保存增长配置')
        return
      }
      try {
        await simApi.saveGrowth(this.existingCfgId, {
          growth_type: this.growthForm.growth_type,
          year1_value: this.growthForm.year1_value,
          year2_value: this.growthForm.year2_value,
          year3_value: this.growthForm.year3_value,
          year4_value: this.growthForm.year4_value,
          year5_value: this.growthForm.year5_value,
          amount_unit: this.growthForm.amount_unit,
          remark: this.growthForm.remark
        })
        this.$message.success('增长配置已保存')
      } catch (e) {
        this.$message.error('保存增长配置失败：' + (e.message || ''))
      }
    },
    /**
     * <p>🆕 重置 12 月节奏为线性 (每��� 8.3333%)</p>
     *
     * @returns {Promise<void>}
     */
    async onResetRhythm() {
      if (!this.existingCfgId) {
        // 还没配置 → 直接在前端填线性
        if (!this.rhythmForm.weights.length) {
          for (let m = 1; m <= 12; m++) {
            this.rhythmForm.weights.push({
              month_no: m, month_label: m + '月', weight: 8.3333, remark: '默认线性（12 个月均匀）'
            })
          }
        }
        for (let m = 0; m < this.rhythmForm.weights.length; m++) {
          this.rhythmForm.weights[m].weight = 8.3333
        }
        this.$message.success('已重置为 12 月线性分配')
        return
      }
      try {
        const res = await simApi.resetRhythmLinear(this.existingCfgId)
        let ws = this.normalizeRhythm((res && res.weights) || [])
        if (!ws.length) {
          // 后端未返回 weights → 兜底再查一次
          const g = await simApi.getRhythm(this.existingCfgId)
          ws = this.normalizeRhythm((g && g.weights) || [])
        }
        if (ws.length) {
          this.rhythmForm.weights = ws
        }
        this.$message.success('已重置为 12 月线性分配')
      } catch (e) {
        this.$message.error('重置失败：' + (e.message || ''))
      }
    },
    /**
     * <p>🆕 保存 12 月节奏配置</p>
     *
     * @returns {Promise<void>}
     */
    async onSaveRhythm() {
      if (!this.existingCfgId) {
        this.$message.warning('请先保存节点配置, 再保存节奏配置')
        return
      }
      if (!this.rhythmTotalValid) {
        this.$message.error('12 个月权重之和必须 = 100%')
        return
      }
      try {
        await simApi.saveRhythm(this.existingCfgId, {
          weights: this.rhythmForm.weights.map(r => ({
            month_no: r.month_no,
            weight: r.weight,
            remark: r.remark
          }))
        })
        this.$message.success('节奏配置已保存')
      } catch (e) {
        this.$message.error('保存节奏失败：' + (e.message || ''))
      }
    },
    /**
     * <p>保存节点配置 (业务占比合计必须 = 100%)</p>
     *
     * @returns {Promise<void>}
     */
    async onSaveCfg() {
      if (!this.selectedNode) return
      if (!this.totalRatioValid) {
        this.$message.error('业务占比之和必须 = 100%')
        return
      }
      this.submitting = true
      try {
        const res = await simApi.saveNodeConfig(this.configScheme.id, {
          coa_node_id: this.selectedNode.id,
          annual_growth_rate: this.cfgForm.annual_growth_rate,
          term_unit: this.cfgForm.term_unit,
          // 🆕 v2.1: 是否模型测算 + 节奏配置类型
          is_model_calc: this.cfgForm.is_model_calc,
          rhythm_type: this.cfgForm.rhythm_type,
          remark: '',
          ratios: this.cfgForm.ratios.map((r, i) => ({
            term_value: r.term_value,
            term_unit: 'MONTH',
            business_ratio: r.business_ratio,
            interest_rate: r.interest_rate || 0,
            sort_order: i + 1
          }))
        })
        if (!this.existingCfgId) {
          this.existingCfgId = (res && res.config_id) || null
          this.configuredCount++
        }
        this.$message.success('已保存')
        // 🆕 刷新树 (更新「已配置」标记)
        const treeRes = await simApi.coaTree(this.configScheme.coaSchemeId, this.configScheme.id)
        this.treeData = (treeRes && treeRes.items) || []
        this.loadSchemes()
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || ''))
      } finally {
        this.submitting = false
      }
    },
    /**
     * <p>删除当前节点的配置</p>
     *
     * @returns {Promise<void>}
     */
    async onDeleteCfg() {
      if (!this.existingCfgId) return
      await simApi.removeNodeConfig(this.existingCfgId)
      this.$message.success('已删除配置')
      this.existingCfgId = null
      this.cfgForm = {
        annual_growth_rate: 5.0, term_unit: 'MONTH', is_model_calc: 1, rhythm_type: 1, ratios: []
      }
      this.configuredCount = Math.max(0, this.configuredCount - 1)
      // 刷新树
      const treeRes = await simApi.coaTree(this.configScheme.coaSchemeId, this.configScheme.id)
      this.treeData = (treeRes && treeRes.items) || []
      this.loadSchemes()
    }
  },
  mounted() {
    this.loadCoaSchemes()
    this.loadSchemes()
  }
}
</script>

<style scoped>
.sim-page { padding: 16px; }
.page-header h2 { margin: 0 0 4px; color: #303133; }
.page-header .desc { margin: 0 0 16px; color: #909399; font-size: 13px; }
.config-layout { display: flex; gap: 16px; height: calc(100vh - 190px); }
.left-tree { flex: 0 0 420px; border-right: 1px solid #ebeef5; padding-right: 12px; overflow: auto; }
.right-form { flex: 1; padding-left: 12px; overflow: auto; }
.empty-tip { color: #909399; text-align: center; padding: 60px 0; }
h5 { margin: 16px 0 8px; color: #303133; font-weight: 600; }

/* ===== 🆕 v2.4: 节点参数配置抽屉 (对齐 Python SimConfigPage) ===== */
.cfg-drawer-body { padding: 12px 20px 24px; }
.cfg-topbar { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #ebeef5; }
.cfg-tree { margin-top: 8px; }
.custom-tree-node { display: flex; align-items: center; justify-content: space-between; width: 100%; padding-right: 8px; }
.tree-node-cfg { color: #67C23A; font-weight: 600; }
.tree-cfg-tag { flex: 0 0 auto; margin-left: 6px; }
.tree-legend { margin-top: 10px; font-size: 12px; color: #909399; }

/* 5 大区域面板 */
.cfg-panel {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px 14px 14px;
  margin-bottom: 14px;
  background: #fff;
}
.cfg-panel-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; color: #303133;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}
.cfg-panel-title .panel-tag { margin-left: 8px; }
.cfg-panel-title .panel-actions { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.cfg-panel-hl { border-color: #b3d8ff; background: #f7fbff; }
.cfg-panel-growth { border-color: #b3e5cd; }
.cfg-panel-ratio { border-color: #ffd8b3; }
.cfg-panel-rhythm { border-color: #d9c2f0; }
.cfg-hint { margin-left: 10px; font-size: 12px; color: #909399; }
.year-label { font-size: 12px; color: #606266; margin-bottom: 4px; text-align: center; }
.year-unit { font-size: 11px; color: #c0c4cc; text-align: center; margin-top: 2px; }
.ratio-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rhythm-total { margin-top: 8px; font-size: 13px; color: #606266; }
.cfg-footer {
  position: sticky; bottom: 0; text-align: center;
  padding: 12px 0; background: #fff;
  border-top: 1px solid #ebeef5;
}
</style>