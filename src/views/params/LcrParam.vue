<template>
  <div class="page-wrap">
    <el-card shadow="never" class="header-card">
      <div class="page-title">
        <i class="el-icon-data-line" style="color: #13c2c2"></i>
        <span>LCR 参数补录</span>
        <el-tag type="success" size="small" effect="plain" style="margin-left: 8px">计量参数补录</el-tag>
        <span class="sub">账户册 × 数据日期 × 分子(HQLA)/分母(30 天净流出)系数</span>
      </div>
      <div class="page-actions">
        <el-button type="primary" icon="el-icon-plus" size="small" @click="onAdd">新增记录</el-button>
      </div>
    </el-card>

    <!-- 3-stat 行 -->
    <el-row :gutter="12" class="stat-row">
      <el-col :span="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label"><i class="el-icon-document"></i> 记录总数</div>
          <div class="stat-value" style="color: #13c2c2">{{ stats.total }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label"><i class="el-icon-upload"></i> LCR 分子节点数</div>
          <div class="stat-value" style="color: #52c41a">{{ stats.numYes }} <small>个</small></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label"><i class="el-icon-download"></i> LCR 分母节点数</div>
          <div class="stat-value" style="color: #fa8c16">{{ stats.denYes }} <small>个</small></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="账户册方案">
          <el-select v-model="filterSchemeId" placeholder="选择账户册方案" filterable clearable
                     style="width: 240px" @change="onFilterChange">
            <el-option v-for="s in schemes" :key="s.id"
                       :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据日期">
          <el-date-picker v-model="filterDate" type="date" placeholder="选择日期"
                          value-format="yyyy-MM-dd" style="width: 180px"
                          @change="onFilterChange" />
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="账户册编码 / 名称 / 规则说明"
                    clearable style="width: 260px" @keyup.enter.native="loadList"
                    @clear="loadList" />
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" @click="loadList">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 说明 alert -->
    <el-alert type="info" :closable="false" show-icon class="info-alert"
              title="ID 生成规则与字段说明">
      <template slot="title">
        <span>ID 生成规则与字段说明</span>
      </template>
      <div slot="default" class="alert-body">
        每条记录 ID = <code>{'{scheme_code}_{node_code}_{YYYYMMDD}'}</code>，
        例如 <code>ZX_COA_S010102010101_20251231</code>。
        <strong style="color:#13c2c2">分子</strong>：HQLA 折算（如国债 Level 1 折 100%、公司债 Level 2A 折 85%）。
        <strong style="color:#fa8c16">分母</strong>：30 天现金流出（如对公活期 48.5%、零售活期 8%、同业拆入 100%）。
        修改方案/节点/数据日期会生成新记录。
      </div>
    </el-alert>

    <!-- 表格 -->
    <el-card shadow="never" class="mt-12">
      <el-table :data="records" border stripe v-loading="loading"
                row-key="id" size="small" :height="tableHeight">
        <el-table-column prop="dataDate" label="数据日期" width="110" fixed="left">
          <template slot-scope="s">
            <el-tag type="info" effect="plain" size="small">{{ s.row.dataDate }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeCode" label="账户册编码" width="160">
          <template slot-scope="s">
            <el-tooltip :content="`${s.row.nodeCode} · ${s.row.nodeName || ''}`" placement="top">
              <el-tag type="info" effect="dark" size="small" style="font-family: monospace">{{ s.row.nodeCode }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="账户册名称" min-width="220"
                         show-overflow-tooltip />
        <el-table-column prop="isNumerator" label="是否 LCR 分子" width="100" align="center">
          <template slot-scope="s">
            <el-tag v-if="Number(s.row.isNumerator)" type="success" size="small">是</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分子折算系数" width="140" align="right">
          <template slot="header" slot-scope="scope">
            <el-tooltip content="分子折算系数 = 项目计入 LCR 分子（HQLA）的权重比例。系数 = 0 表示该项目纳入分子计算口径但实际贡献为 0" placement="top">
              <span>分子折算系数 <i class="el-icon-question" style="color:#bbb"></i></span>
            </el-tooltip>
          </template>
          <template slot-scope="s">
            <span v-if="Number(s.row.numFactor) === 0" class="num-zero">
              0.000000<small class="zero-tip">(贡献为0)</small>
            </span>
            <span v-else class="num-cell">{{ Number(s.row.numFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="numOperator" label="分子运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.numOperator === '+' ? 'primary' : 'warning'"
                    size="small" class="op-tag">{{ opLabel(s.row.numOperator) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isDenominator" label="是否 LCR 分母" width="100" align="center">
          <template slot-scope="s">
            <el-tag v-if="Number(s.row.isDenominator)" type="success" size="small">是</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分母折算系数" width="140" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.denFactor) === 0" class="num-zero">
              0.000000<small class="zero-tip">(贡献为0)</small>
            </span>
            <span v-else class="num-cell">{{ Number(s.row.denFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="denOperator" label="分母运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.denOperator === '+' ? 'primary' : 'warning'"
                    size="small" class="op-tag">{{ opLabel(s.row.denOperator) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ruleNote" label="规则说明" min-width="240"
                         show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'" size="mini">
              {{ s.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template slot-scope="s">
            <el-button type="text" icon="el-icon-edit" @click="onEdit(s.row)">编辑</el-button>
            <el-button type="text" icon="el-icon-delete" style="color:#f56c6c"
                       @click="onRemove(s.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑 -->
    <el-dialog :title="dlg.id ? `编辑 LCR 参数：${dlg.nodeCode}` : '新增 LCR 参数'"
               :visible.sync="dlg.show" width="720px" @closed="onDlgClosed">
      <el-form :model="dlg" :rules="rules" ref="formRef" label-width="110px" size="small">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册方案" prop="schemeId">
              <el-select v-model="dlg.schemeId" placeholder="选择账户册方案" filterable
                         style="width:100%" :disabled="!!dlg.id"
                         @change="onSchemeChange">
                <el-option v-for="s in schemes" :key="s.id"
                           :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据日期" prop="dataDate">
              <el-date-picker v-model="dlg.dataDate" type="date" placeholder="选择日期"
                              value-format="yyyy-MM-dd" style="width:100%"
                              :disabled="!!dlg.id" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户册节点" prop="nodeId">
          <el-select v-model="dlg.nodeId" placeholder="选择账户册节点" filterable
                     style="width:100%" :disabled="!!dlg.id"
                     @change="onNodeChange">
            <el-option v-for="n in nodesOfScheme" :key="n.id"
                       :label="`${n.nodeCode} | ${n.nodeName}`" :value="n.id" />
          </el-select>
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册编码">
              <el-input v-model="dlg.nodeCode" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账户册名称">
              <el-input v-model="dlg.nodeName" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">分子参数（HQLA 合格优质流动性资产）</el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否分子">
              <el-switch v-model="dlg.isNumerator"
                         active-color="#13c2c2" inactive-color="#dcdfe6"
                         active-value="1" inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="分子折算系数">
              <el-input-number v-model="dlg.numFactor" :min="0" :max="1" :step="0.0001"
                               :precision="6" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="分子运算符">
              <el-select v-model="dlg.numOperator" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey"
                           :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">分母参数（30 天净流出）</el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否分母">
              <el-switch v-model="dlg.isDenominator"
                         active-color="#fa8c16" inactive-color="#dcdfe6"
                         active-value="1" inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="分母折算系数">
              <el-input-number v-model="dlg.denFactor" :min="0" :step="0.0001"
                               :precision="6" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="分母运算符">
              <el-select v-model="dlg.denOperator" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey"
                           :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他</el-divider>
        <el-form-item label="LCR 规则说明">
          <el-input v-model="dlg.ruleNote" type="textarea" :rows="2"
                    placeholder="如：对公一般贷款 流入 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="dlg.status" style="width:200px">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" :loading="dlg.submitting" @click="onSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/api/request'

export default {
  name: 'LcrParam',
  data() {
    const today = new Date()
    const defaultDate = '2025-12-31'
    return {
      // === 选项 ===
      schemes: [],
      nodes: [],
      operators: [],
      availableDates: [],

      // === 筛选 ===
      filterSchemeId: null,
      filterDate: defaultDate,
      keyword: '',

      // === 列表 ===
      records: [],
      loading: false,
      tableHeight: 600,

      // === 新增/编辑 ===
      dlg: {
        show: false,
        submitting: false,
        id: null,
        schemeId: null,
        schemeCode: '',
        nodeId: null,
        nodeCode: '',
        nodeName: '',
        dataDate: defaultDate,
        isNumerator: '0',
        numFactor: 0,
        numOperator: '+',
        isDenominator: '0',
        denFactor: 0,
        denOperator: '+',
        currentBalance: 0,
        ruleNote: '',
        status: 'ACTIVE'
      },

      rules: {
        schemeId: [{ required: true, message: '请选择账户册方案', trigger: 'change' }],
        dataDate: [{ required: true, message: '请选择数据日期', trigger: 'change' }],
        nodeId:   [{ required: true, message: '请选择账户册节点', trigger: 'change' }]
      }
    }
  },
  computed: {
    nodesOfScheme() {
      if (!this.filterSchemeId) return this.nodes
      return this.nodes.filter(n => Number(n.schemeId) === Number(this.filterSchemeId))
    },
    stats() {
      const total = this.records.length
      const numYes = this.records.filter(r => Number(r.isNumerator)).length
      const denYes = this.records.filter(r => Number(r.isDenominator)).length
      return { total, numYes, denYes }
    }
  },
  watch: {
    'filterSchemeId': { handler() { this.loadList() } },
    'filterDate':     { handler() { this.loadList() } }
  },
  async mounted() {
    await this.loadOptions()
    this.calcTableHeight()
    window.addEventListener('resize', this.calcTableHeight)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.calcTableHeight)
  },
  methods: {
    // ===== 选项 =====
    async loadOptions() {
      try {
        const resp = await request.get('/lcr-param/options')
        const r = resp || {}
        this.schemes = r.schemes || []
        this.nodes = r.nodes || []
        this.operators = r.operators || []
        this.availableDates = r.dataDates || []
        // 默认选 ZX_COA（演示数据所在方案）
        const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
        if (zxcoa) {
          this.filterSchemeId = zxcoa.id
        } else if (this.schemes.length && !this.filterSchemeId) {
          this.filterSchemeId = this.schemes[0].id
        }
      } catch (e) {
        this.$message.error('选项加载失败：' + (e.message || ''))
      }
    },

    // ===== 列表 =====
    async loadList() {
      this.loading = true
      try {
        const params = {}
        if (this.filterSchemeId) params.schemeId = this.filterSchemeId
        if (this.filterDate)     params.dataDate = this.filterDate
        if (this.keyword && this.keyword.trim()) params.keyword = this.keyword.trim()
        const resp = await request.get('/lcr-param', { params })
        this.records = (resp && resp.items) || (Array.isArray(resp) ? resp : [])
      } catch (e) {
        this.$message.error('列表加载失败：' + (e.message || ''))
        this.records = []
      } finally {
        this.loading = false
      }
    },

    onFilterChange() { this.loadList() },

    onReset() {
      const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
      this.filterSchemeId = zxcoa ? zxcoa.id : (this.schemes[0] ? this.schemes[0].id : null)
      this.filterDate = '2025-12-31'
      this.keyword = ''
      this.loadList()
    },

    // ===== 新增 / 编辑 =====
    onAdd() {
      this.dlg = {
        show: true,
        submitting: false,
        id: null,
        schemeId: this.filterSchemeId,
        schemeCode: (this.schemes.find(s => s.id === this.filterSchemeId) || {}).schemeCode || '',
        nodeId: null, nodeCode: '', nodeName: '',
        dataDate: this.filterDate || '2025-12-31',
        isNumerator: '0', numFactor: 0, numOperator: '+',
        isDenominator: '0', denFactor: 0, denOperator: '+',
        currentBalance: 0,
        ruleNote: '',
        status: 'ACTIVE'
      }
    },

    onEdit(row) {
      this.dlg = {
        show: true,
        submitting: false,
        id: row.id,
        schemeId: row.schemeId,
        schemeCode: row.schemeCode || '',
        nodeId: row.nodeId,
        nodeCode: row.nodeCode || '',
        nodeName: row.nodeName || '',
        dataDate: row.dataDate,
        isNumerator: String(row.isNumerator || 0),
        numFactor: Number(row.numFactor || 0),
        numOperator: row.numOperator || '+',
        isDenominator: String(row.isDenominator || 0),
        denFactor: Number(row.denFactor || 0),
        denOperator: row.denOperator || '+',
        currentBalance: Number(row.currentBalance || 0),
        ruleNote: row.ruleNote || '',
        status: row.status || 'ACTIVE'
      }
    },

    onSchemeChange(v) {
      const sch = this.schemes.find(s => s.id === v)
      this.dlg.schemeCode = sch ? sch.schemeCode : ''
      this.dlg.nodeId = null
      this.dlg.nodeCode = ''
      this.dlg.nodeName = ''
    },

    onNodeChange(v) {
      const nd = this.nodesOfScheme.find(n => n.id === v)
      if (nd) {
        this.dlg.nodeCode = nd.nodeCode
        this.dlg.nodeName = nd.nodeName
      }
    },

    async onSave() {
      try {
        await this.$refs.formRef.validate()
      } catch (e) { return }
      this.dlg.submitting = true
      try {
        const body = {
          schemeId: this.dlg.schemeId,
          schemeCode: this.dlg.schemeCode,
          nodeId: this.dlg.nodeId,
          nodeCode: this.dlg.nodeCode,
          nodeName: this.dlg.nodeName,
          dataDate: this.dlg.dataDate,
          isNumerator: this.dlg.isNumerator,
          numFactor: Number(this.dlg.numFactor || 0),
          numOperator: this.dlg.numOperator,
          isDenominator: this.dlg.isDenominator,
          denFactor: Number(this.dlg.denFactor || 0),
          denOperator: this.dlg.denOperator,
          currentBalance: Number(this.dlg.currentBalance || 0),
          ruleNote: this.dlg.ruleNote || '',
          status: this.dlg.status || 'ACTIVE'
        }
        if (this.dlg.id) {
          await request.put(`/lcr-param/${this.dlg.id}`, body)
          this.$message.success('已更新')
        } else {
          await request.post('/lcr-param', body)
          this.$message.success('已新增')
        }
        this.dlg.show = false
        this.loadList()
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || ''))
      } finally {
        this.dlg.submitting = false
      }
    },

    async onRemove(row) {
      try {
        await this.$confirm(`确认删除 LCR 参数记录 [${row.nodeCode}]？`, '提示', { type: 'warning' })
        await request.delete(`/lcr-param/${row.id}`)
        this.$message.success('已删除')
        this.loadList()
      } catch (e) {
        if (e === 'cancel') return
        this.$message.error('删除失败：' + (e.message || ''))
      }
    },

    onDlgClosed() {
      this.dlg.show = false
    },

    // ===== 工具 =====
    opLabel(k) {
      const o = this.operators.find(it => it.dictKey === k)
      return o ? o.dictLabel : k
    },
    calcTableHeight() {
      this.tableHeight = Math.max(400, window.innerHeight - 380)
    }
  }
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.header-card {
  border-top: 3px solid #13c2c2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.page-title .sub { font-size: 12px; color: #999; font-weight: normal; margin-left: 8px; }
.stat-row { margin-top: 12px; }
.stat-card { padding: 4px 0; }
.stat-label { color: #666; font-size: 13px; margin-bottom: 4px; }
.stat-value { font-size: 26px; font-weight: 600; font-family: 'Roboto Mono', Consolas, monospace; }
.stat-value small { font-size: 12px; color: #999; margin-left: 2px; font-weight: normal; }
.filter-card { margin-top: 12px; }
.info-alert { margin-top: 12px; }
.alert-body { font-size: 13px; line-height: 1.8; }
.mt-12 { margin-top: 12px; }
.num-cell {
  font-family: 'Roboto Mono', Consolas, monospace;
  font-weight: 600;
}
.num-zero {
  font-family: 'Roboto Mono', Consolas, monospace;
  color: #bfbfbf;
}
.num-zero .zero-tip {
  margin-left: 4px;
  color: #999;
  font-size: 11px;
}
.op-tag {
  font-family: 'Roboto Mono', Consolas, monospace;
  font-weight: 600;
}
</style>
