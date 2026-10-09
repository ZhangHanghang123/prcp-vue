<template>
  <div class="nim-param-page">
    <el-card class="main-card" shadow="never">
      <div slot="header" class="card-header">
        <span>
          <i class="el-icon-data-analysis" style="color:#13c2c2"></i>
          NIM 参数补录
          <el-tag type="cyan" size="mini" style="margin-left:8px">计量参数补录</el-tag>
        </span>
        <el-button type="primary" icon="el-icon-plus" size="small" @click="onAdd">新增记录</el-button>
      </div>

      <!-- 3 大统计：记录总数 / 生息资产节点数 / 计息负债节点数 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">记录总数</div>
            <div class="stat-value" style="color:#13c2c2">{{ stats.total }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">生息资产节点数</div>
            <div class="stat-value" style="color:#52c41a">{{ stats.assetYes }} <small style="font-size:13px;color:#909399">个</small></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">计息负债节点数</div>
            <div class="stat-value" style="color:#fa8c16">{{ stats.liabilityYes }} <small style="font-size:13px;color:#909399">个</small></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 筛选条 -->
      <el-card shadow="never" class="filter-card">
        <el-form :inline="true" size="small">
          <el-form-item label="账户册方案">
            <el-select
              v-model="filters.schemeId"
              placeholder="选择方案（默认 ZX_COA）"
              clearable
              filterable
              style="width:240px"
              @change="onFilterChange"
            >
              <el-option
                v-for="s in options.schemes"
                :key="s.id"
                :value="s.id"
                :label="`${s.scheme_code} | ${s.scheme_name}`"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="数据日期">
            <el-date-picker
              v-model="filters.dataDate"
              type="date"
              value-format="yyyy-MM-dd"
              placeholder="选择数据日期"
              style="width:180px"
              @change="onFilterChange"
            />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="账户册编码 / 名称 / 规则说明"
              clearable
              style="width:240px"
              @keyup.enter.native="loadList"
              @clear="loadList"
            />
          </el-form-item>
          <el-form-item>
            <el-button icon="el-icon-search" type="primary" @click="loadList">查询</el-button>
            <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ID 规则 + NIM 说明 -->
      <el-alert
        title="ID 生成规则与字段说明"
        type="info"
        :closable="false"
        show-icon
        class="alert-box"
      >
        <template slot="title">ID 生成规则与字段说明</template>
        <div slot="default">
          每条记录 ID = <code>{'{scheme_code}_{node_code}_{YYYYMMDD}'}</code>，
          例如 <code>ZX_COA_S010102010101_20251231</code>。
          <strong>NIM 说明</strong>：<strong>净息差 NIM</strong> = (生息资产利息收入 − 计息负债利息支出) / 生息资产。
          其中「生息资产利率」（如对公贷款 4.5%、信用卡 12%）与「计息负债利率」（如对公活期 0.5%、MLF 2.5%）通过运算符
          （+ 加项 / − 减项）参与加权计算。修改方案 / 节点 / 数据日期会生成新记录。
        </div>
      </el-alert>

      <!-- 表格 -->
      <el-table
        :data="records"
        v-loading="loading"
        border
        stripe
        size="small"
        row-key="id"
        style="margin-top:12px"
      >
        <el-table-column prop="dataDate" label="数据日期" width="110" align="center">
          <template slot-scope="{ row }">
            <el-tag type="cyan" size="mini">{{ row.dataDate }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeCode" label="账户册编码" width="160" show-overflow-tooltip>
          <template slot-scope="{ row }">
            <el-tooltip :content="`${row.nodeCode} · ${row.nodeName || ''}`" placement="top">
              <span style="font-family:Consolas,monospace">
                <el-tag type="geekblue" size="mini">{{ row.nodeCode }}</el-tag>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="账户册名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="是否生息资产" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag v-if="row.isInterestAsset" type="success" size="mini">是</el-tag>
            <el-tag v-else type="info" size="mini">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="资产利率" width="120" align="right">
          <template slot-scope="{ row }">
            <span class="rate-mono">{{ fmtRate(row.assetRate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="资产运算符" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.assetOperator === '+' ? 'primary' : 'warning'" size="mini" class="op-tag">{{ row.assetOperator || '+' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否计息负债" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag v-if="row.isInterestLiability" type="success" size="mini">是</el-tag>
            <el-tag v-else type="info" size="mini">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负债利率" width="120" align="right">
          <template slot-scope="{ row }">
            <span class="rate-mono">{{ fmtRate(row.liabilityRate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="负债运算符" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.liabilityOperator === '+' ? 'primary' : 'warning'" size="mini" class="op-tag">{{ row.liabilityOperator || '+' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ruleNote" label="规则说明" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="mini">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" icon="el-icon-edit" @click="onEdit(row)">编辑</el-button>
            <el-button type="text" size="mini" icon="el-icon-delete" style="color:#f56c6c" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑对话框 -->
    <el-dialog
      :title="editing ? `编辑 NIM 参数：${editing.nodeCode}` : '新增 NIM 参数'"
      :visible.sync="dialogVisible"
      width="720px"
      :close-on-click-modal="false"
      @closed="onDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="small">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="账户册方案" prop="schemeId">
              <el-select
                v-model="form.schemeId"
                placeholder="选择方案"
                filterable
                style="width:100%"
                :disabled="!!editing"
                @change="onSchemeChange"
              >
                <el-option
                  v-for="s in options.schemes"
                  :key="s.id"
                  :value="s.id"
                  :label="`${s.scheme_code} | ${s.scheme_name}`"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据日期" prop="dataDate">
              <el-date-picker
                v-model="form.dataDate"
                type="date"
                value-format="yyyy-MM-dd"
                placeholder="选择数据日期"
                style="width:100%"
                :disabled="!!editing"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户册节点" prop="nodeId">
          <el-select
            v-model="form.nodeId"
            placeholder="选择账户册节点（按当前方案筛选）"
            filterable
            style="width:100%"
            :disabled="!!editing"
            @change="onNodeChange"
          >
            <el-option
              v-for="n in nodesOfScheme"
              :key="n.id"
              :value="n.id"
              :label="`${n.node_code} | ${n.node_name}`"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="账户册编码">
              <el-input v-model="form.nodeCode" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账户册名称">
              <el-input v-model="form.nodeName" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">生息资产（分子）</el-divider>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="是否生息资产">
              <el-switch
                v-model="form.isInterestAsset"
                :active-value="1"
                :inactive-value="0"
                active-color="#13c2c2"
                active-text="是"
                inactive-text="否"
              />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="资产利率">
              <el-input-number
                v-model="form.assetRate"
                :precision="6"
                :step="0.0001"
                :min="0"
                :max="1"
                style="width:100%"
                placeholder="0~1（如 0.045 = 4.5%）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="资产运算符">
              <el-select v-model="form.assetOperator" style="width:100%">
                <el-option
                  v-for="o in options.operators"
                  :key="o.dict_key"
                  :value="o.dict_key"
                  :label="o.dict_label || o.dict_key"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">计息负债（分母）</el-divider>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="是否计息负债">
              <el-switch
                v-model="form.isInterestLiability"
                :active-value="1"
                :inactive-value="0"
                active-color="#fa8c16"
                active-text="是"
                inactive-text="否"
              />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="负债利率">
              <el-input-number
                v-model="form.liabilityRate"
                :precision="6"
                :step="0.0001"
                :min="0"
                :max="1"
                style="width:100%"
                placeholder="0~1（如 0.005 = 0.5%）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="负债运算符">
              <el-select v-model="form.liabilityOperator" style="width:100%">
                <el-option
                  v-for="o in options.operators"
                  :key="o.dict_key"
                  :value="o.dict_key"
                  :label="o.dict_label || o.dict_key"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他</el-divider>
        <el-form-item label="NIM 规则说明">
          <el-input v-model="form.ruleNote" type="textarea" :rows="2" placeholder="如：对公一般贷款 4.5% 流入 NIM 计算" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:180px">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/api/request'

/**
 * @file NIM 参数补录
 * @desc 监管指标 NIM (Net Interest Margin 净息差) 的参数补录页面。
 *       布局: 头部 + 3-stat 行(记录总数/生息资产节点/计息负债节点) + 筛选条(方案/日期/关键词) + 规则说明 alert + 表格 + 增改删弹窗。
 *       NIM = (生息资产利息收入 − 计息负债利息支出) / 生息资产。
 *       每条记录 ID = {scheme_code}_{node_code}_{YYYYMMDD}，修改方案/节点/数据日期会生成新记录。
 *       默认方案 ZX_COA (演示数据所在方案)，默认数据日期 2025-12-31。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /nim-param         - 列表
 *   GET    /nim-param/options - 下拉选项(方案/节点/运算符/日期)
 *   POST   /nim-param         - 新增
 *   PUT    /nim-param/{id}    - 更新
 *   DELETE /nim-param/{id}    - 删除
 *
 * 关联组件: 无
 * 关联路由: /nim-param (group: 计量参数补录)
 */

const DEFAULT_FORM = () => ({
  schemeId: null,
  schemeCode: '',
  nodeId: null,
  nodeCode: '',
  nodeName: '',
  dataDate: '2025-12-31',
  isInterestAsset: 0,
  assetRate: 0,
  assetOperator: '+',
  isInterestLiability: 0,
  liabilityRate: 0,
  liabilityOperator: '+',
  currentBalance: 0,
  ruleNote: '',
  status: 'ACTIVE'
})

export default {
  name: 'NimParam',
  data() {
    return {
      loading: false,
      submitting: false,
      records: [],
      options: { schemes: [], nodes: [], operators: [], data_dates: [] },
      /** 顶部筛选条件 (方案 ID / 数据日期 / 关键字) */
      filters: {
        schemeId: null,
        dataDate: '2025-12-31',
        keyword: ''
      },
      dialogVisible: false,
      editing: null,
      /** 编辑弹窗的表单数据 */
      form: DEFAULT_FORM(),
      rules: {
        schemeId: [{ required: true, message: '请选择账户册方案', trigger: 'change' }],
        nodeId: [{ required: true, message: '请选择账户册节点', trigger: 'change' }],
        dataDate: [{ required: true, message: '请选择数据日期', trigger: 'change' }]
      }
    }
  },
  computed: {
    stats() {
      return {
        total: this.records.length,
        assetYes: this.records.filter(r => Number(r.isInterestAsset) === 1).length,
        liabilityYes: this.records.filter(r => Number(r.isInterestLiability) === 1).length
      }
    },
    nodesOfScheme() {
      const sid = this.form.schemeId
      if (!sid) return this.options.nodes
      return this.options.nodes.filter(n => Number(n.scheme_id) === Number(sid))
    }
  },
  watch: {
    'filters.schemeId'() { this.loadList() },
    'filters.dataDate'() { this.loadList() }
  },
  methods: {
    /**
     * <p>利率格式化 (空 / NaN / 0 → "0.000000", 否则保留 6 位小数)</p>
     *
     * @param {number|string} v 利率原始值 (0~1, 如 0.045 = 4.5%)
     * @returns {string} 格式化字符串
     */
    fmtRate(v) {
      const n = Number(v)
      if (v == null || isNaN(n) || n === 0) return '0.000000'
      return n.toFixed(6)
    },

    /**
     * <p>加载下拉选项 (方案/节点/运算符/日期), 默认选 ZX_COA 方案</p>
     *
     * @returns {Promise<void>}
     */
    async loadOptions() {
      try {
        const r = await request.get('/nim-param/options')
        this.options = {
          schemes: (r && r.schemes) || [],
          nodes: (r && r.nodes) || [],
          operators: (r && r.operators) || [],
          data_dates: (r && r.data_dates) || []
        }
        // 默认选 ZX_COA
        if (this.filters.schemeId == null) {
          const zx = this.options.schemes.find(s => s.scheme_code === 'ZX_COA')
          this.filters.schemeId = zx ? zx.id : (this.options.schemes[0] && this.options.schemes[0].id) || null
        }
      } catch (e) {
        this.$message.error('选项加载失败：' + (e.message || ''))
      }
    },

    /**
     * <p>按 filters 当前条件加载列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadList() {
      this.loading = true
      try {
        const params = {}
        if (this.filters.schemeId) params.schemeId = this.filters.schemeId
        if (this.filters.dataDate) params.dataDate = this.filters.dataDate
        if (this.filters.keyword) params.keyword = this.filters.keyword
        const r = await request.get('/nim-param', { params })
        this.records = (r && r.items) || []
      } catch (e) {
        this.$message.error('列表加载失败：' + (e.message || ''))
      } finally {
        this.loading = false
      }
    },

    /** 筛选条件变更时刷新列表 */
    onFilterChange() {
      this.loadList()
    },

    /** 重置筛选条件为默认 (ZX_COA + 2025-12-31 + 空关键字) */
    onReset() {
      const zx = this.options.schemes.find(s => s.scheme_code === 'ZX_COA')
      this.filters.schemeId = zx ? zx.id : (this.options.schemes[0] && this.options.schemes[0].id) || null
      this.filters.dataDate = '2025-12-31'
      this.filters.keyword = ''
    },

    // ===== 新增 / 编辑 =====
    /**
     * <p>打开新增弹窗 (复用筛选条件预填方案/日期)</p>
     *
     * @returns {void}
     */
    onAdd() {
      this.editing = null
      this.form = DEFAULT_FORM()
      if (this.filters.schemeId) {
        this.form.schemeId = this.filters.schemeId
        const sch = this.options.schemes.find(s => Number(s.id) === Number(this.filters.schemeId))
        if (sch) this.form.schemeCode = sch.scheme_code
      }
      if (this.filters.dataDate) this.form.dataDate = this.filters.dataDate
      this.dialogVisible = true
    },

    /**
     * <p>打开编辑弹窗, 用行数据回填表单</p>
     *
     * @param {Object} row 表格行 (含 id/schemeId/nodeId 等字段)
     * @returns {void}
     */
    onEdit(row) {
      this.editing = row
      this.form = {
        schemeId: row.schemeId,
        schemeCode: row.schemeCode,
        nodeId: row.nodeId,
        nodeCode: row.nodeCode,
        nodeName: row.nodeName,
        dataDate: row.dataDate,
        isInterestAsset: Number(row.isInterestAsset) === 1 ? 1 : 0,
        assetRate: Number(row.assetRate || 0),
        assetOperator: row.assetOperator || '+',
        isInterestLiability: Number(row.isInterestLiability) === 1 ? 1 : 0,
        liabilityRate: Number(row.liabilityRate || 0),
        liabilityOperator: row.liabilityOperator || '+',
        currentBalance: Number(row.currentBalance || 0),
        ruleNote: row.ruleNote || '',
        status: row.status || 'ACTIVE'
      }
      this.dialogVisible = true
    },

    /**
     * <p>对话框方案切换: 同步 schemeCode 并清空已选节点</p>
     *
     * @param {number|string} sid 选中的方案 ID
     * @returns {void}
     */
    onSchemeChange(sid) {
      const sch = this.options.schemes.find(s => Number(s.id) === Number(sid))
      this.form.schemeCode = sch ? sch.scheme_code : ''
      // 清掉已选节点（方案变了，原节点可能不适用）
      this.form.nodeId = null
      this.form.nodeCode = ''
      this.form.nodeName = ''
    },

    /** 节点选择后自动回填编码/名称 */
    onNodeChange(nid) {
      const nd = this.nodesOfScheme.find(n => Number(n.id) === Number(nid))
      if (nd) {
        this.form.nodeCode = nd.node_code
        this.form.nodeName = nd.node_name
      }
    },

    /**
     * <p>保存弹窗 (新增或更新), 带表单校验 + nodeName 自动补全</p>
     *
     * @returns {Promise<void>}
     */
    async onSave() {
      try {
        await this.$refs.formRef.validate()
      } catch (e) {
        return
      }
      // 校验：节点未选时直接拒绝
      if (!this.form.nodeId) {
        this.$message.warning('请选择账户册节点')
        return
      }
      // 自动补 node_name（前端没传时）
      let nodeName = this.form.nodeName
      if (!nodeName && this.form.nodeId) {
        const nd = this.nodesOfScheme.find(n => Number(n.id) === Number(this.form.nodeId))
        nodeName = (nd && nd.node_name) || ''
      }
      this.submitting = true
      try {
        const payload = {
          schemeId: this.form.schemeId,
          schemeCode: this.form.schemeCode,
          nodeId: this.form.nodeId,
          nodeCode: this.form.nodeCode,
          nodeName,
          dataDate: this.form.dataDate,
          isInterestAsset: Number(this.form.isInterestAsset) === 1 ? 1 : 0,
          assetRate: Number(this.form.assetRate || 0),
          assetOperator: this.form.assetOperator || '+',
          isInterestLiability: Number(this.form.isInterestLiability) === 1 ? 1 : 0,
          liabilityRate: Number(this.form.liabilityRate || 0),
          liabilityOperator: this.form.liabilityOperator || '+',
          currentBalance: Number(this.form.currentBalance || 0),
          ruleNote: this.form.ruleNote,
          status: this.form.status || 'ACTIVE'
        }
        if (this.editing) {
          await request.put('/nim-param/' + this.editing.id, payload)
          this.$message.success('已更新')
        } else {
          await request.post('/nim-param', payload)
          this.$message.success('已新增')
        }
        this.dialogVisible = false
        this.loadList()
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || ''))
      } finally {
        this.submitting = false
      }
    },

    /**
     * <p>删除一条记录 (带 confirm 二次确认)</p>
     *
     * @param {Object} row 表格行 (含 id/nodeCode/dataDate 字段)
     * @returns {void}
     */
    onRemove(row) {
      this.$confirm(`确认删除 NIM 记录「${row.nodeCode} @ ${row.dataDate}」？`, '提示', { type: 'warning' })
        .then(async () => {
          try {
            await request.delete('/nim-param/' + row.id)
            this.$message.success('已删除')
            this.loadList()
          } catch (e) {
            this.$message.error('删除失败：' + (e.message || ''))
          }
        })
        .catch(() => {})
    },

    /** 对话框关闭后清空校验 */
    onDialogClosed() {
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate()
      })
    }
  },
  async mounted() {
    await this.loadOptions()
    this.loadList()
  }
}
</script>

<style scoped>
.nim-param-page { padding: 16px; }
.main-card { margin-bottom: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.stat-row { margin-bottom: 16px; }
.stat-card { background: #fafafa; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 6px; }
.stat-value { font-size: 24px; font-weight: 600; line-height: 1.2; }
.filter-card { margin-bottom: 12px; background: #fafafa; }
.alert-box { margin-bottom: 12px; }
.alert-box code { background: #f0f9ff; color: #1890ff; padding: 1px 4px; border-radius: 3px; font-family: Consolas, monospace; }
.rate-mono { font-family: Consolas, 'Courier New', monospace; font-weight: 600; }
.op-tag { font-family: Consolas, monospace; font-weight: 700; }
</style>
