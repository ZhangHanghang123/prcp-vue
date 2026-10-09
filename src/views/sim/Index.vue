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

    <!-- 节点配置抽屉 -->
    <el-drawer title="节点配置" :visible.sync="configDrawerVisible" direction="rtl" size="68%">
      <div v-if="configScheme" style="padding:16px">
        <h4>方案：<el-tag>{{ configScheme.schemeCode }}</el-tag> {{ configScheme.schemeName }}</h4>
        <p class="desc" style="margin:6px 0 16px">
          起始月：<el-tag size="mini">{{ configScheme.dataDate }}</el-tag>
          · 已配置节点数：<b>{{ configuredCount }}</b>
        </p>

        <div class="config-layout">
          <!-- 左：节点树 -->
          <div class="left-tree">
            <el-input v-model="treeKw" placeholder="搜索节点编码/名称" size="small" clearable />
            <el-tree
              ref="treeRef"
              :data="filteredTree"
              node-key="id"
              :props="{ label: 'title', children: 'children' }"
              highlight-current
              :filter-node-method="filterTreeNode"
              @node-click="onTreeClick"
              style="margin-top:8px; max-height:70vh; overflow:auto"
            />
          </div>
          <!-- 右：配置表单 -->
          <div class="right-form">
            <div v-if="!selectedNode" class="empty-tip">
              <i class="el-icon-arrow-left"></i> 请在左侧选择一个节点
            </div>
            <div v-else>
              <h5>节点信息</h5>
              <el-descriptions :column="2" border size="small" style="margin-bottom:16px">
                <el-descriptions-item label="编码">{{ selectedNode.nodeCode || selectedNode.code }}</el-descriptions-item>
                <el-descriptions-item label="名称">{{ selectedNode.nodeName || selectedNode.name }}</el-descriptions-item>
                <el-descriptions-item label="层级">L{{ selectedNode.nodeLevel || selectedNode.level }}</el-descriptions-item>
                <el-descriptions-item label="类型">{{ selectedNode.nodeType || selectedNode.type }}</el-descriptions-item>
                <el-descriptions-item label="当前余额日期" :span="2">{{ selectedNode.current_balance_date || '—' }}</el-descriptions-item>
                <el-descriptions-item label="当前余额(元)" :span="2">
                  <span v-if="selectedNode.current_balance_amount != null">{{ Number(selectedNode.current_balance_amount).toFixed(2) }}</span>
                  <span v-else>—</span>
                </el-descriptions-item>
              </el-descriptions>

              <h5>增长率 + 期限占比</h5>
              <el-form :model="cfgForm" label-width="120px" size="small">
                <el-form-item label="年化增长率(%)">
                  <el-input-number v-model="cfgForm.annual_growth_rate" :precision="2" :step="0.5" :min="0" :max="100" />
                </el-form-item>
                <el-form-item label="期限单位">
                  <el-select v-model="cfgForm.term_unit" style="width:200px">
                    <el-option label="MONTH 月" value="MONTH" />
                  </el-select>
                </el-form-item>
                <el-form-item label="业务占比合计">
                  <el-tag :type="totalRatioValid ? 'success' : 'danger'">
                    {{ totalRatio.toFixed(2) }}% {{ totalRatioValid ? '✓' : '✗ 必须 = 100%' }}
                  </el-tag>
                </el-form-item>
                <el-form-item label="期限占比子表">
                  <el-button size="mini" @click="addRatioRow">+ 增加期限</el-button>
                </el-form-item>
              </el-form>

              <el-table :data="cfgForm.ratios" border size="small" style="margin-bottom:12px">
                <el-table-column label="期限(月)" width="120">
                  <template #default="{ row }">
                    <el-input-number v-model="row.term_value" :min="1" :max="60" :step="1" size="mini" style="width:90px" />
                  </template>
                </el-table-column>
                <el-table-column label="业务占比(%)" width="140">
                  <template #default="{ row }">
                    <el-input-number v-model="row.business_ratio" :min="0" :max="100" :precision="2" :step="1" size="mini" style="width:110px" />
                  </template>
                </el-table-column>
                <el-table-column label="新业务利率(%)" width="140">
                  <template #default="{ row }">
                    <el-input-number v-model="row.interest_rate" :min="0" :max="100" :precision="4" :step="0.01" size="mini" style="width:110px" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" align="center">
                  <template #default="{ $index }">
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="removeRatioRow($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div style="text-align:center">
                <el-button type="primary" @click="onSaveCfg" :loading="submitting">保存配置</el-button>
                <el-button v-if="existingCfgId" type="danger" @click="onDeleteCfg">删除配置</el-button>
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
      filter: { coa_scheme_id: null, status: '', keyword: '' },
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
      selectedNode: null,
      /** 节点配置表单 (年化增长率 + 期限单位 + 期限占比子表) */
      cfgForm: { annual_growth_rate: 5.0, term_unit: 'MONTH', ratios: [] },
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
          coa_scheme_id: this.filter.coa_scheme_id || undefined
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
      this.filter = { coa_scheme_id: null, status: '', keyword: '' }
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
     * <p>打开节点配置抽屉, 加载账户册节点树</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async onConfig(row) {
      this.configScheme = row
      this.configDrawerVisible = true
      this.treeKw = ''
      this.selectedNode = null
      const treeRes = await simApi.coaTree(row.coaSchemeId)
      this.treeData = (treeRes.data && treeRes.data.items) || []
      this.configuredCount = row.configNodeCount || 0
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
     * <p>点击节点树叶子节点 — 加载节点详情 + 配置</p>
     *
     * @param {Object} node 节点对象
     * @returns {Promise<void>}
     */
    async onTreeClick(node) {
      if (!node.isLeaf) return
      this.selectedNode = await simApi.nodeInfo(node.id).then(r => r.data)
      const cfgRes = await simApi.getNodeConfig(this.configScheme.id, node.id)
      const d = cfgRes.data
      this.existingCfgId = d.exists ? d.config.id : null
      if (d.exists) {
        this.cfgForm = {
          annual_growth_rate: Number(d.config.annualGrowthRate) || 0,
          term_unit: d.config.termUnit || 'MONTH',
          ratios: (d.ratios || []).map(r => ({
            term_value: r.termValue,
            business_ratio: Number(r.businessRatio),
            interest_rate: Number(r.interestRate) || 0
          }))
        }
      } else {
        this.cfgForm = { annual_growth_rate: 5.0, term_unit: 'MONTH', ratios: [] }
      }
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
        await simApi.saveNodeConfig(this.configScheme.id, {
          coa_node_id: this.selectedNode.id,
          annual_growth_rate: this.cfgForm.annual_growth_rate,
          term_unit: this.cfgForm.term_unit,
          remark: '',
          ratios: this.cfgForm.ratios.map((r, i) => ({
            term_value: r.term_value,
            term_unit: 'MONTH',
            business_ratio: r.business_ratio,
            interest_rate: r.interest_rate || 0,
            sort_order: i + 1
          }))
        })
        this.$message.success('已保存')
        this.configuredCount++
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
      this.cfgForm = { annual_growth_rate: 5.0, term_unit: 'MONTH', ratios: [] }
      this.configuredCount = Math.max(0, this.configuredCount - 1)
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
.config-layout { display: flex; gap: 16px; height: calc(100vh - 240px); }
.left-tree { flex: 0 0 280px; border-right: 1px solid #ebeef5; padding-right: 12px; overflow: auto; }
.right-form { flex: 1; padding-left: 12px; overflow: auto; }
.empty-tip { color: #909399; text-align: center; padding: 60px 0; }
h5 { margin: 16px 0 8px; color: #303133; font-weight: 600; }
</style>