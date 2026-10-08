<template>
  <div class="cet1-param-page">
    <el-card shadow="never">
      <!-- ====== 头部 ====== -->
      <div slot="header" class="page-header">
        <span>
          <i class="el-icon-data-analysis" style="color:#13c2c2;"></i>
          CET1 参数补录
        </span>
        <el-tag type="success" size="medium" effect="plain" style="margin-left:12px;">计量参数补录</el-tag>
        <div class="header-tools">
          <el-button type="primary" icon="el-icon-plus" size="small" @click="onAdd">新增记录</el-button>
        </div>
      </div>

      <!-- ====== KPI 统计 ====== -->
      <el-row :gutter="16" style="margin-bottom:16px;">
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title"><i class="el-icon-document"></i> 记录总数</div>
            <div class="stat-value" style="color:#13c2c2;">{{ records.length }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title"><i class="el-icon-success"></i> CET1 分子节点数</div>
            <div class="stat-value" style="color:#52c41a;">{{ statNum }} <span class="stat-unit">个</span></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title"><i class="el-icon-warning-outline"></i> RWA 风险节点数</div>
            <div class="stat-value" style="color:#fa8c16;">{{ statRwa }} <span class="stat-unit">个</span></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- ====== 筛选条 ====== -->
      <el-card shadow="never" class="filter-card">
        <el-row :gutter="12" type="flex" align="middle">
          <el-col :span="6">
            <el-select v-model="flt.schemeId" placeholder="账户册方案" filterable clearable style="width:100%;">
              <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-date-picker v-model="flt.dataDate" type="date" placeholder="数据日期"
                            value-format="yyyy-MM-dd" style="width:100%;" />
          </el-col>
          <el-col :span="7">
            <el-input v-model="flt.keyword" placeholder="搜索账户册编码 / 名称 / 规则说明"
                      clearable @keyup.enter.native="loadList" @clear="loadList">
              <el-button slot="append" icon="el-icon-search" @click="loadList"></el-button>
            </el-input>
          </el-col>
          <el-col :span="5">
            <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
          </el-col>
        </el-row>
      </el-card>

      <!-- ====== 说明 ====== -->
      <el-alert title="ID 生成规则与字段说明" type="info" show-icon :closable="false" style="margin:16px 0;">
        <template slot="description">
          每条记录 ID = <code>{'{scheme_code}_{node_code}_{YYYYMMDD}'}</code>，
          例如 <code>ZX_COA_S010102010101_20251231</code>。
          <strong style="color:#52c41a;">CET1 分子</strong>：核心资本折算（如股本 / 资本公积 / 未分配利润 各按 100% 计入）；
          <strong style="color:#fa8c16;">RWA 风险</strong>：风险加权资产（如对公一般贷款 100%、个人贷款 70%、国债 AC 0%）。
          修改方案 / 节点 / 数据日期会生成新记录。
        </template>
      </el-alert>

      <!-- ====== 表格 ====== -->
      <el-table :data="records" v-loading="loading" border stripe row-key="id"
                :height="tableH" style="width:100%;">
        <el-table-column prop="dataDate" label="数据日期" width="110" fixed="left">
          <template slot-scope="s">
            <el-tag type="cyan" effect="plain" size="small">{{ s.row.dataDate }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeCode" label="账户册编码" width="170">
          <template slot-scope="s">
            <el-tooltip :content="`${s.row.nodeCode} · ${s.row.nodeName || ''}`" placement="top">
              <el-tag effect="dark" size="small" style="font-family:monospace;">{{ s.row.nodeCode }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="账户册名称" width="200" show-overflow-tooltip />
        <el-table-column prop="isNumerator" label="是否CET1分子" width="110" align="center">
          <template slot-scope="s">
            <el-tag v-if="s.row.isNumerator" type="success" effect="dark" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分子折算系数" width="140" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.numeratorFactor) === 0" class="num-zero">0.000000<small>(贡献为0)</small></span>
            <span v-else class="num-bold">{{ Number(s.row.numeratorFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="numeratorOperator" label="分子运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.numeratorOperator === '+' ? 'primary' : 'warning'"
                    effect="plain" size="small" class="op-tag">{{ opLabel(s.row.numeratorOperator) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isRwa" label="是否RWA" width="100" align="center">
          <template slot-scope="s">
            <el-tag v-if="s.row.isRwa" type="success" effect="dark" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="RWA风险权重" width="140" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.rwaWeight) === 0" class="num-zero">0.000000<small>(贡献为0)</small></span>
            <span v-else class="num-bold">{{ Number(s.row.rwaWeight).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rwaOperator" label="RWA运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.rwaOperator === '+' ? 'primary' : 'warning'"
                    effect="plain" size="small" class="op-tag">{{ opLabel(s.row.rwaOperator) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ruleNote" label="规则说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="s">
            <el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ s.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template slot-scope="s">
            <el-button type="text" size="small" icon="el-icon-edit" @click="onEdit(s.row)">编辑</el-button>
            <el-popconfirm title="确认删除该条记录？" @onConfirm="onRemove(s.row)">
              <el-button slot="reference" type="text" size="small" icon="el-icon-delete" style="color:#C9332B;">删除</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ====== 编辑对话框 ====== -->
    <el-dialog :title="dlg.editing ? `编辑 CET1 参数：${dlg.editing.nodeCode}` : '新增 CET1 参数'"
               :visible.sync="dlg.show" width="720px" @closed="onDlgClosed" :close-on-click-modal="false">
      <el-form :model="dlg" label-position="top" size="small">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="账户册方案" required>
              <el-select v-model="dlg.schemeId" placeholder="选择账户册方案"
                         filterable :disabled="!!dlg.editing" style="width:100%;"
                         @change="onDlgSchemeChange">
                <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据日期" required>
              <el-date-picker v-model="dlg.dataDate" type="date" placeholder="选择数据日期"
                              value-format="yyyy-MM-dd" :disabled="!!dlg.editing" style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户册节点" required>
          <el-select v-model="dlg.nodeId" placeholder="选择账户册节点"
                     filterable :disabled="!!dlg.editing" style="width:100%;" @change="onNodeChange">
            <el-option v-for="n in nodesOfScheme" :key="n.id" :label="`${n.nodeCode} | ${n.nodeName}`" :value="n.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
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

        <el-divider content-position="left"><span style="color:#52c41a;font-weight:600;">分子参数 (CET1)</span></el-divider>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="是否分子">
              <el-switch v-model="dlg.isNumerator" :active-value="1" :inactive-value="0"
                         active-color="#52c41a" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="分子折算系数">
              <el-input-number v-model="dlg.numeratorFactor" :precision="6" :step="0.0001" :min="0" :max="1" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="分子运算符">
              <el-select v-model="dlg.numeratorOperator" placeholder="选择运算符" style="width:100%;">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left"><span style="color:#fa8c16;font-weight:600;">RWA 参数</span></el-divider>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="是否 RWA">
              <el-switch v-model="dlg.isRwa" :active-value="1" :inactive-value="0"
                         active-color="#fa8c16" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="RWA 风险权重">
              <el-input-number v-model="dlg.rwaWeight" :precision="6" :step="0.0001" :min="0" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="RWA 运算符">
              <el-select v-model="dlg.rwaOperator" placeholder="选择运算符" style="width:100%;">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left"><span style="color:#666;">其他</span></el-divider>
        <el-form-item label="规则说明">
          <el-input v-model="dlg.ruleNote" type="textarea" :rows="2"
                    maxlength="500" show-word-limit
                    placeholder="如：对公一般贷款 流入 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="dlg.status" style="width:100%;">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" :loading="dlg.saving" @click="onSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/api/request'

export default {
  name: 'Cet1Param',
  data() {
    return {
      loading: false,
      tableH: 600,
      records: [],
      schemes: [],
      nodes: [],
      operators: [],
      dataDates: [],
      flt: {
        schemeId: undefined,
        dataDate: '2025-12-31',
        keyword: ''
      },
      dlg: this.makeBlankDlg()
    }
  },
  computed: {
    /** 按筛选方案过滤的节点（与 React 版 nodesOfScheme 一致，用于对话框节点选择） */
    nodesOfScheme() {
      return this.flt.schemeId
        ? this.nodes.filter(n => n.schemeId === this.flt.schemeId)
        : this.nodes
    },
    statNum() { return this.records.filter(r => r.isNumerator).length },
    statRwa() { return this.records.filter(r => r.isRwa).length }
  },
  watch: {
    'flt.schemeId': function () { this.loadList() },
    'flt.dataDate': function ()  { this.loadList() }
  },
  mounted() {
    this.loadOptions()
  },
  methods: {
    /** 新对话框默认值 */
    makeBlankDlg() {
      return {
        show: false,
        saving: false,
        editing: null,
        schemeId: undefined,
        dataDate: '',
        nodeId: undefined,
        nodeCode: '',
        nodeName: '',
        isNumerator: 0,
        numeratorFactor: 0,
        numeratorOperator: '+',
        isRwa: 0,
        rwaWeight: 0,
        rwaOperator: '+',
        currentBalance: 0,
        ruleNote: '',
        status: 'ACTIVE'
      }
    },
    opLabel(key) {
      const o = this.operators.find(x => x.dictKey === key)
      return o ? o.dictLabel : (key || '')
    },
    async loadOptions() {
      try {
        const r = await request.get('/cet1-param/options')
        this.schemes   = r.schemes   || []
        this.nodes     = r.nodes     || []
        this.operators = r.operators || []
        this.dataDates = (r.data_dates || []).map(d => (typeof d === 'string' ? d : (d.dataDate || '')))
        // 默认选 ZX_COA（演示数据所在方案）
        const zx = this.schemes.find(s => s.schemeCode === 'ZX_COA')
        if (zx) this.flt.schemeId = zx.id
        else if (this.schemes.length && !this.flt.schemeId) this.flt.schemeId = this.schemes[0].id
      } catch (e) {
        this.$message.error('选项加载失败')
      }
    },
    async loadList() {
      this.loading = true
      try {
        const params = {}
        if (this.flt.schemeId) params.schemeId = this.flt.schemeId
        if (this.flt.dataDate) params.dataDate = this.flt.dataDate
        if (this.flt.keyword)  params.keyword  = this.flt.keyword
        const r = await request.get('/cet1-param', { params })
        this.records = (r && r.items) || (Array.isArray(r) ? r : [])
      } catch (e) {
        this.$message.error('列表加载失败')
      } finally {
        this.loading = false
      }
    },
    onReset() {
      const zx = this.schemes.find(s => s.schemeCode === 'ZX_COA')
      this.flt = {
        schemeId: zx ? zx.id : (this.schemes[0] ? this.schemes[0].id : undefined),
        dataDate: '2025-12-31',
        keyword: ''
      }
    },
    onAdd() {
      this.dlg = this.makeBlankDlg()
      this.dlg.schemeId = this.flt.schemeId
      this.dlg.dataDate = this.flt.dataDate || '2025-12-31'
      this.dlg.show = true
    },
    onEdit(r) {
      this.dlg = {
        ...this.makeBlankDlg(),
        show: true,
        editing: r,
        schemeId: r.schemeId,
        dataDate: r.dataDate,
        nodeId:   r.nodeId,
        nodeCode: r.nodeCode,
        nodeName: r.nodeName || '',
        isNumerator:        r.isNumerator ? 1 : 0,
        numeratorFactor:    Number(r.numeratorFactor || 0),
        numeratorOperator:  r.numeratorOperator || '+',
        isRwa:              r.isRwa ? 1 : 0,
        rwaWeight:          Number(r.rwaWeight || 0),
        rwaOperator:        r.rwaOperator || '+',
        currentBalance:     Number(r.currentBalance || 0),
        ruleNote:           r.ruleNote || '',
        status:             r.status || 'ACTIVE'
      }
    },
    onDlgClosed() {
      this.dlg = this.makeBlankDlg()
    },
    /** 切换对话框方案时清空已选节点 */
    onDlgSchemeChange() {
      this.dlg.nodeId = undefined
      this.dlg.nodeCode = ''
      this.dlg.nodeName = ''
    },
    /** 选择节点后自动填充编码/名称 */
    onNodeChange(v) {
      const n = this.nodesOfScheme.find(x => x.id === v)
      if (n) {
        this.dlg.nodeCode = n.nodeCode
        this.dlg.nodeName = n.nodeName
      }
    },
    onSave() {
      if (!this.dlg.schemeId) return this.$message.error('请选择账户册方案')
      if (!this.dlg.dataDate) return this.$message.error('请选择数据日期')
      if (!this.dlg.nodeId)   return this.$message.error('请选择账户册节点')
      const sch = this.schemes.find(s => s.id === this.dlg.schemeId)
      const payload = {
        schemeId:    this.dlg.schemeId,
        schemeCode:  sch ? sch.schemeCode : '',
        nodeId:      this.dlg.nodeId,
        nodeCode:    this.dlg.nodeCode,
        nodeName:    this.dlg.nodeName,
        dataDate:    this.dlg.dataDate,
        isNumerator:        this.dlg.isNumerator ? 1 : 0,
        numeratorFactor:    Number(this.dlg.numeratorFactor || 0),
        numeratorOperator:  this.dlg.numeratorOperator,
        isRwa:              this.dlg.isRwa ? 1 : 0,
        rwaWeight:          Number(this.dlg.rwaWeight || 0),
        rwaOperator:        this.dlg.rwaOperator,
        currentBalance:     Number(this.dlg.currentBalance || 0),
        ruleNote:           this.dlg.ruleNote,
        status:             this.dlg.status || 'ACTIVE'
      }
      this.dlg.saving = true
      const op = this.dlg.editing
        ? request.put('/cet1-param/' + this.dlg.editing.id, payload)
        : request.post('/cet1-param', payload)
      op.then(() => {
        this.$message.success(this.dlg.editing ? '已更新' : '已新增')
        this.dlg.show = false
        this.loadList()
      }).catch(err => {
        this.$message.error(err && err.message ? err.message : '保存失败')
      }).finally(() => { this.dlg.saving = false })
    },
    onRemove(r) {
      request.delete('/cet1-param/' + r.id).then(() => {
        this.$message.success('已删除')
        this.loadList()
      }).catch(err => {
        this.$message.error(err && err.message ? err.message : '删除失败')
      })
    }
  }
}
</script>

<style scoped>
.cet1-param-page { padding: 16px; }

.page-header {
  display: flex;
  align-items: center;
  color: #C7000B;
  font-weight: 600;
  font-size: 16px;
}
.page-header .header-tools {
  margin-left: auto;
}

.stat-card { background: #fafcff; }
.stat-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
}
.stat-unit {
  font-size: 13px;
  color: #999;
  font-weight: normal;
  margin-left: 4px;
}

.filter-card {
  background: #fafafa;
  margin-bottom: 16px;
}

.num-zero  { font-family: monospace; color: #bfbfbf; }
.num-zero  small { margin-left: 6px; color: #999; }
.num-bold  { font-weight: 600; font-family: monospace; color: #333; }
.op-tag    { font-family: monospace; font-weight: 600; }
</style>