<template>
  <div class="esg-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- Tab 1: 方案管理 -->
      <el-tab-pane label="📋 方案管理" name="schemes">
        <div v-loading="loading.schemes">
          <!-- 顶部按钮 -->
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="16">
              <el-input v-model="schemeFilter.keyword" placeholder="搜索方案代码/名称" style="width:240px;margin-right:8px" clearable />
              <el-select v-model="schemeFilter.status" placeholder="状态" clearable style="width:120px;margin-right:8px">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="就绪" value="READY" />
                <el-option label="归档" value="ARCHIVED" />
              </el-select>
              <el-button icon="el-icon-search" @click="loadSchemes">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetFilter">重置</el-button>
            </el-col>
            <el-col :span="8" style="text-align:right">
              <el-button type="primary" icon="el-icon-plus" @click="openSchemeDialog()">新建方案</el-button>
              <el-button icon="el-icon-magic-stick" @click="onCaseRun">一键演示</el-button>
            </el-col>
          </el-row>

          <el-table :data="schemes" stripe size="small" border>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="schemeCode" label="方案代码" width="180" />
            <el-table-column prop="schemeName" label="方案名称" width="200" />
            <el-table-column prop="dataSource" label="数据源" width="80">
              <template slot-scope="s"><el-tag size="mini">{{ s.row.dataSource }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="startDate" label="开始" width="100" />
            <el-table-column prop="endDate" label="结束" width="100" />
            <el-table-column prop="nFactors" label="因子数" width="70" />
            <el-table-column prop="nScenarios" label="情景数" width="80" />
            <el-table-column prop="nSteps" label="月步数" width="80" />
            <el-table-column prop="runCount" label="运行数" width="80" />
            <el-table-column label="状态" width="80">
              <template slot-scope="s">
                <el-tag size="mini" :type="statusType(s.row.status)">{{ statusLabel(s.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="320" fixed="right">
              <template slot-scope="s">
                <el-button size="mini" type="text" icon="el-icon-view" @click="openSchemeDialog(s.row)">查看</el-button>
                <el-button size="mini" type="text" icon="el-icon-copy" @click="openCloneDialog(s.row)">克隆</el-button>
                <el-dropdown size="medium" trigger="click" style="margin-left:6px" @command="c => onSchemeCmd(c, s.row)">
                  <span class="el-dropdown-link link-primary">
                    <i class="el-icon-video-play"></i> 执行<i class="el-icon-arrow-down el-icon--right"></i>
                  </span>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="fit-pca" icon="el-icon-data-line">1️⃣ PCA 拟合</el-dropdown-item>
                    <el-dropdown-item command="generate-hjm" icon="el-icon-magic-stick">2️⃣ HJM 生成</el-dropdown-item>
                    <el-dropdown-item command="generate" icon="el-icon-folder">3️⃣ 情景集</el-dropdown-item>
                    <el-dropdown-item command="run-all" divided icon="el-icon-finished">⚡ 一键三步</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <el-button size="mini" type="text" icon="el-icon-delete" style="color:#C9332B" @click="onDeleteScheme(s.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination class="pager" :page-size="schemesResp.pageSize" :total="schemesResp.total"
                          :current-page.sync="schemesResp.page" layout="total, prev, pager, next" @current-change="loadSchemes" />
        </div>
      </el-tab-pane>

      <!-- Tab 2: Svensson 曲线 -->
      <el-tab-pane label="📈 Svensson 曲线" name="curves">
        <div v-loading="loading.curves">
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="16">
              <el-select v-model="curveFilter.source" placeholder="数据源" clearable style="width:160px;margin-right:8px">
                <el-option v-for="s in curveSourcesItems" :key="s.source" :label="`${s.source} (${s.cnt})`" :value="s.source" />
              </el-select>
              <el-date-picker v-model="curveFilter.startDate" type="date" value-format="yyyy-MM-dd" placeholder="开始" style="width:140px;margin-right:6px" />
              <el-date-picker v-model="curveFilter.endDate" type="date" value-format="yyyy-MM-dd" placeholder="结束" style="width:140px;margin-right:8px" />
              <el-button icon="el-icon-search" @click="loadCurves">查询</el-button>
            </el-col>
            <el-col :span="8" style="text-align:right">
              <el-button type="primary" icon="el-icon-plus" @click="openCurveDialog()">新增/更新曲线</el-button>
              <el-button icon="el-icon-upload" @click="openBulkDialog">批量导入</el-button>
              <el-button icon="el-icon-data-line" @click="openRatesDialog">利率还原</el-button>
            </el-col>
          </el-row>

          <el-table :data="curves" stripe size="small" border>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="curveDate" label="曲线日" width="120" />
            <el-table-column prop="source" label="数据源" width="100" />
            <el-table-column prop="theta0" label="θ₀" width="80" />
            <el-table-column prop="theta1" label="θ₁" width="80" />
            <el-table-column prop="theta2" label="θ₂" width="80" />
            <el-table-column prop="theta3" label="θ₃" width="80" />
            <el-table-column prop="lambda1" label="λ₁" width="80" />
            <el-table-column prop="lambda2" label="λ₂" width="80" />
            <el-table-column prop="description" label="描述" />
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Tab 3: 运行历史 -->
      <el-tab-pane label="🔄 运行历史" name="runs">
        <div v-loading="loading.runs">
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="20">
              <el-select v-model="runFilter.schemeId" placeholder="按方案筛选" clearable style="width:200px;margin-right:8px" filterable>
                <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} - ${s.schemeName}`" :value="s.id" />
              </el-select>
              <el-select v-model="runFilter.runType" placeholder="类型" clearable style="width:140px;margin-right:8px">
                <el-option label="PCA 拟合" value="PCA_FIT" />
                <el-option label="HJM 生成" value="HJM_GENERATE" />
                <el-option label="情景集生成" value="SCENARIO_GENERATE" />
              </el-select>
              <el-button icon="el-icon-search" @click="loadAllRuns">查询</el-button>
            </el-col>
          </el-row>

          <el-table :data="allRuns" stripe size="small" border>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="schemeCode" label="方案" width="180" />
            <el-table-column label="类型" width="120">
              <template slot-scope="s">
                <el-tag size="mini" :type="runTypeColor(s.row.runType)">{{ runTypeLabel(s.row.runType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template slot-scope="s">
                <el-tag size="mini" :type="s.row.status==='SUCCESS'?'success':'danger'">{{ s.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="durationMs" label="耗时(ms)" width="100" />
            <el-table-column prop="createdAt" label="创建时间" width="180" />
            <el-table-column label="摘要" min-width="200">
              <template slot-scope="s">
                <el-button size="mini" type="text" @click="openRunDialog(s.row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Tab 4: 情景集 -->
      <el-tab-pane label="📦 情景集" name="scenarios">
        <div v-loading="loading.scenarios">
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="20">
              <el-select v-model="scenarioFilter.schemeId" placeholder="按方案筛选" clearable style="width:200px;margin-right:8px" filterable>
                <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode}`" :value="s.id" />
              </el-select>
              <el-button icon="el-icon-search" @click="loadScenarios">查询</el-button>
            </el-col>
          </el-row>

          <el-table :data="scenarios" stripe size="small" border>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="schemeId" label="方案ID" width="80" />
            <el-table-column prop="scenarioCode" label="情景代码" width="140" />
            <el-table-column prop="nScenarios" label="情景数" width="80" />
            <el-table-column prop="nSteps" label="月步数" width="80" />
            <el-table-column prop="nMaturities" label="期限数" width="80" />
            <el-table-column prop="seed" label="种子" width="70" />
            <el-table-column label="blob" width="70">
              <template slot-scope="s">
                <el-tag size="mini" :type="s.row.hasBlob?'success':'info'">{{ s.row.hasBlob?'是':'否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="nZeros" label="=0" width="60" />
            <el-table-column prop="nNegatives" label="<0" width="60" />
            <el-table-column prop="fileSizeBytes" label="大小(B)" width="100" />
            <el-table-column prop="createdAt" label="创建时间" width="180" />
<el-table-column label="操作" width="180" fixed="right">
                <template slot-scope="s">
                  <el-button size="mini" type="text" icon="el-icon-data-line" @click="openStatsDialog(s.row)">统计</el-button>
                  <el-button size="mini" type="text" icon="el-icon-download" style="color:#0B6FF2">
                    <a :href="downloadScenarioUrl(s.row.scenarioCode)" target="_blank" style="color:inherit;text-decoration:none">下载</a>
                  </el-button>
                </template>
              </el-table-column>
          </el-table>
          <el-pagination class="pager" :page-size="scenariosResp.pageSize" :total="scenariosResp.total"
                          :current-page.sync="scenariosResp.page" layout="total, prev, pager, next" @current-change="loadScenarios" />
        </div>
      </el-tab-pane>

      <!-- Tab 5: 缓存诊断 -->
      <el-tab-pane label="🛠 缓存诊断" name="cache">
        <div v-loading="loading.cache">
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="20">
              <el-button icon="el-icon-refresh" @click="loadCache">刷新缓存</el-button>
            </el-col>
          </el-row>
          <el-card shadow="never">
            <pre class="cache-pre">{{ JSON.stringify(cacheData, null, 2) }}</pre>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 方案 编辑/查看 弹窗 -->
    <el-dialog :title="schemeDialog.id ? (schemeDialog.viewOnly ? '查看方案' : '编辑方案') : '新建方案'" :visible.sync="schemeDialog.visible" width="720px">
      <el-form :model="schemeDialog.form" label-width="120px" size="small">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="方案代码"><el-input v-model="schemeDialog.form.schemeCode" :disabled="schemeDialog.id" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="方案名称"><el-input v-model="schemeDialog.form.schemeName" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="数据源">
            <el-select v-model="schemeDialog.form.dataSource">
              <el-option label="ECB" value="ECB" /><el-option label="FRB" value="FRB" />
              <el-option label="CUSTOM" value="CUSTOM" /><el-option label="BANK" value="BANK" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="8"><el-form-item label="因子数">
            <el-input-number v-model="schemeDialog.form.nFactors" :min="1" :max="6" />
          </el-form-item></el-col>
          <el-col :span="8"><el-form-item label="状态">
            <el-select v-model="schemeDialog.form.status">
              <el-option label="草稿" value="DRAFT" /><el-option label="就绪" value="READY" /><el-option label="归档" value="ARCHIVED" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="开始日期"><el-date-picker v-model="schemeDialog.form.startDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="结束日期"><el-date-picker v-model="schemeDialog.form.endDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="随机种子"><el-input-number v-model="schemeDialog.form.seed" :min="0" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="情景数"><el-input-number v-model="schemeDialog.form.nScenarios" :min="10" :max="10000" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="月步数"><el-input-number v-model="schemeDialog.form.nSteps" :min="12" :max="360" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="24"><el-form-item label="期限数组(月)"><el-input v-model="schemeDialog.form.maturitiesMonthsStr" placeholder="逗号分隔，如 1,3,6,12,24,60,120,240" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="24"><el-form-item label="初始利率(%)"><el-input v-model="schemeDialog.form.initialYieldsPctStr" placeholder="逗号分隔，与期限数组等长（可选）" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="描述"><el-input v-model="schemeDialog.form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="schemeDialog.visible=false">取消</el-button>
        <el-button v-if="!schemeDialog.viewOnly" type="primary" @click="submitScheme">保存</el-button>
      </span>
    </el-dialog>

    <!-- 克隆弹窗 -->
    <el-dialog title="克隆方案" :visible.sync="cloneDialog.visible" width="480px">
      <el-form label-width="100px" size="small">
        <el-form-item label="新方案代码"><el-input v-model="cloneDialog.newCode" /></el-form-item>
        <el-form-item label="新方案名称"><el-input v-model="cloneDialog.newName" placeholder="留空则自动加 '副本' 后缀" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="cloneDialog.visible=false">取消</el-button>
        <el-button type="primary" @click="submitClone">克隆</el-button>
      </span>
    </el-dialog>

    <!-- 曲线 新增/更新 弹窗 -->
    <el-dialog title="新增/更新 Svensson 曲线" :visible.sync="curveDialog.visible" width="640px">
      <el-form :model="curveDialog.form" label-width="100px" size="small">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="曲线日"><el-date-picker v-model="curveDialog.form.curveDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="数据源">
            <el-select v-model="curveDialog.form.source">
              <el-option label="ECB" value="ECB" /><el-option label="FRB" value="FRB" />
              <el-option label="CUSTOM" value="CUSTOM" /><el-option label="BANK" value="BANK" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6"><el-form-item label="θ₀"><el-input-number v-model="curveDialog.form.theta0" :precision="6" :step="0.1" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="θ₁"><el-input-number v-model="curveDialog.form.theta1" :precision="6" :step="0.1" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="θ₂"><el-input-number v-model="curveDialog.form.theta2" :precision="6" :step="0.1" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="θ₃"><el-input-number v-model="curveDialog.form.theta3" :precision="6" :step="0.1" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="λ₁"><el-input-number v-model="curveDialog.form.lambda1" :precision="6" :step="0.1" :min="0.01" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="λ₂"><el-input-number v-model="curveDialog.form.lambda2" :precision="6" :step="0.1" :min="0.01" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="描述"><el-input v-model="curveDialog.form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="curveDialog.visible=false">取消</el-button>
        <el-button type="primary" @click="submitCurve">保存</el-button>
      </span>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog title="批量导入曲线 (JSON)" :visible.sync="bulkDialog.visible" width="640px">
      <el-input v-model="bulkDialog.json" type="textarea" :rows="10" placeholder='[{"curveDate":"2024-01-15","source":"ECB","theta0":1.0,...}]' />
      <span slot="footer">
        <el-button @click="bulkDialog.visible=false">取消</el-button>
        <el-button type="primary" @click="submitBulk">导入</el-button>
      </span>
    </el-dialog>

    <!-- 利率还原弹窗 -->
    <el-dialog title="单日利率还原" :visible.sync="ratesDialog.visible" width="540px">
      <el-form label-width="100px" size="small">
        <el-form-item label="曲线日"><el-date-picker v-model="ratesDialog.curveDate" type="date" value-format="yyyy-MM-dd" style="width:200px" /></el-form-item>
        <el-form-item label="数据源"><el-select v-model="ratesDialog.source" style="width:200px">
          <el-option label="ECB" value="ECB" /><el-option label="FRB" value="FRB" />
          <el-option label="CUSTOM" value="CUSTOM" /><el-option label="BANK" value="BANK" />
        </el-select></el-form-item>
        <el-form-item label="期限(月)"><el-input v-model="ratesDialog.tenors" placeholder="逗号分隔，如 1,3,6,12,24,60,120" /></el-form-item>
      </el-form>
      <el-table v-if="ratesDialog.result.length" :data="ratesDialog.result" size="mini">
        <el-table-column prop="tenor" label="期限(月)" />
        <el-table-column label="利率(%)">
          <template slot-scope="s">{{ Number(s.row.ratePct).toFixed(4) }}</template>
        </el-table-column>
        <el-table-column label="利率(小数)">
          <template slot-scope="s">{{ Number(s.row.rateDec).toFixed(6) }}</template>
        </el-table-column>
      </el-table>
      <span slot="footer">
        <el-button @click="ratesDialog.visible=false">关闭</el-button>
        <el-button type="primary" @click="computeRates">还原</el-button>
      </span>
    </el-dialog>

    <!-- Run 详情弹窗 -->
    <el-dialog title="Run 详情" :visible.sync="runDialog.visible" width="640px">
      <el-descriptions :column="2" border size="small" v-if="runDialog.data.id">
        <el-descriptions-item label="ID">{{ runDialog.data.id }}</el-descriptions-item>
        <el-descriptions-item label="方案">{{ runDialog.data.schemeCode }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ runDialog.data.runType }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ runDialog.data.status }}</el-descriptions-item>
        <el-descriptions-item label="耗时(ms)">{{ runDialog.data.durationMs }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ runDialog.data.createdAt }}</el-descriptions-item>
      </el-descriptions>
      <el-tabs v-if="runDialog.data.id">
        <el-tab-pane label="Params"><pre>{{ JSON.stringify(runDialog.data.params, null, 2) }}</pre></el-tab-pane>
        <el-tab-pane label="Output"><pre style="max-height:400px;overflow:auto">{{ JSON.stringify(runDialog.data.output, null, 2) }}</pre></el-tab-pane>
      </el-tabs>
      <span slot="footer">
        <el-button @click="runDialog.visible=false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- Scenario Stats 弹窗 -->
    <el-dialog :title="`情景集 ${statsDialog.code} 统计`" :visible.sync="statsDialog.visible" width="800px">
      <div v-loading="loading.stats">
        <el-row :gutter="12" v-if="statsDialog.data.scenarioCode">
          <el-col :span="6"><el-statistic title="情景数" :value="statsDialog.data.nScenarios" /></el-col>
          <el-col :span="6"><el-statistic title="月步数" :value="statsDialog.data.nSteps" /></el-col>
          <el-col :span="6"><el-statistic title="期限数" :value="statsDialog.data.nMaturities" /></el-col>
          <el-col :span="6"><el-statistic title="零利率样本" :value="statsDialog.data.nZeros" /></el-col>
        </el-row>
        <div ref="statsChart" class="stats-chart"></div>
        <el-table :data="finalDistTable" size="mini" border>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="maturity" label="期限(月)" width="100" />
          <el-table-column prop="mean" label="均值(%)" width="100" />
          <el-table-column prop="std" label="标准差(%)" width="100" />
          <el-table-column prop="min" label="最小(%)" width="100" />
          <el-table-column prop="max" label="最大(%)" width="100" />
        </el-table>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import * as api from '@/api/esg'

/**
 * @file 利率情景生成器 (ESG - Economic Scenario Generator)
 * @desc 基于 Svensson 曲线的 HJM 模型 + PCA 拟合, 生成多套利率情景。
 *       包含 5 个 Tab:
 *         1) 方案管理 - Svensson 拟合方案 + PCA 因子数 + 情景数 + 月步数 + 期限数组
 *         2) Svensson 曲线 - 每日 θ₀/θ₁/θ₂/θ₃/λ₁/λ₂ 参数 (支持批量导入 + 单日利率还原)
 *         3) 运行历史 - PCA 拟合 / HJM 生成 / 情景集生成 三类历史
 *         4) 情景集 - 情景集列表 (nScenarios × nSteps × nMaturities) + 统计 + 下载
 *         5) 缓存诊断 - 内存缓存状态 JSON 展示
 *       一键演示 = 创建 PRCP_ESG_DEMO_001 方案并跑三步 (PCA → HJM → 情景集)。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /esg/scheme?keyword=&status=&page=&pageSize=      - 方案分页
 *   POST   /esg/scheme                                         - 新建方案
 *   PUT    /esg/scheme/{id}                                    - 更新方案
 *   DELETE /esg/scheme/{id}                                    - 删除方案
 *   POST   /esg/scheme/{id}/clone                              - 克隆方案
 *   POST   /esg/scheme/{id}/fit-pca    | run-all | generate-hjm | generate-scenarios - 执行
 *   POST   /esg/case-run                                       - 一键演示
 *   GET    /esg/curve?source=&startDate=&endDate=              - 曲线列表
 *   GET    /esg/curve/sources                                  - 曲线数据源汇总
 *   POST   /esg/curve                                          - 新增/更新单条 (upsert)
 *   POST   /esg/curve/bulk                                     - 批量导入
 *   POST   /esg/svensson-rates                                 - 单日利率还原
 *   GET    /esg/run?schemeId=&runType=&page=&pageSize=         - 运行历史
 *   GET    /esg/run/{id}                                       - 运行详情
 *   GET    /esg/scenario?schemeId=&page=&pageSize=             - 情景集
 *   GET    /esg/scenario/stats/{scenarioCode}                  - 情景统计
 *   GET    /esg/scenario/download/{scenarioCode}               - 下载
 *   GET    /esg/cache                                          - 缓存信息
 *
 * 关联组件: 无
 * 关联路由: /esg (group: 利率情景生成器)
 */
export default {
  data() {
    return {
      activeTab: 'schemes',
      loading: { schemes: false, curves: false, runs: false, scenarios: false, cache: false, stats: false },
      // ===== 方案 =====
      schemeFilter: { keyword: '', status: '' },
      schemes: [],
      schemesResp: { page: 1, pageSize: 10, total: 0 },
      schemeDialog: {
        visible: false, id: null, viewOnly: false,
        form: this._emptySchemeForm()
      },
      cloneDialog: { visible: false, srcId: null, newCode: '', newName: '' },
      // ===== 曲线 =====
      curveFilter: { source: '', startDate: '', endDate: '' },
      curves: [],
      curveSourcesItems: [],
      curveDialog: { visible: false, form: this._emptyCurveForm() },
      bulkDialog: { visible: false, json: '' },
      ratesDialog: { visible: false, curveDate: '2024-01-15', source: 'ECB', tenors: '1,3,6,12,24,60,120', result: [] },
      // ===== 运行历史 =====
      runFilter: { schemeId: null, runType: '' },
      allRuns: [],
      runDialog: { visible: false, data: {} },
      // ===== 情景集 =====
      scenarioFilter: { schemeId: null },
      scenarios: [],
      scenariosResp: { page: 1, pageSize: 10, total: 0 },
      statsDialog: { visible: false, code: '', data: {}, maturities: [] },
      finalDistTable: [],
      // ===== 缓存 =====
      cacheData: {}
    }
  },

  computed: {
    // 字典映射
    STATUS_TYPES: () => ({ DRAFT: 'info', READY: 'success', ARCHIVED: 'warning' }),
    STATUS_LABELS: () => ({ DRAFT: '草稿', READY: '就绪', ARCHIVED: '归档' }),
    RUN_TYPES: () => ({ PCA_FIT: { label: 'PCA 拟合', type: 'primary' }, HJM_GENERATE: { label: 'HJM 生成', type: 'warning' }, SCENARIO_GENERATE: { label: '情景集', type: 'success' } })
  },

  mounted() {
    this.loadSchemes()
    this.loadCurveSources()
  },

  methods: {
    /** 返回空方案表单 (含默认值) */
    _emptySchemeForm() {
      return { schemeCode: '', schemeName: '', description: '', dataSource: 'ECB',
        startDate: '2024-01-01', endDate: '2025-12-31',
        nFactors: 3, nScenarios: 1000, nSteps: 120, seed: 42, status: 'DRAFT',
        maturitiesMonthsStr: '1,3,6,12,24,36,48,60,84,120,180,240,361',
        initialYieldsPctStr: '' }
    },
    /** 返回空曲线表单 (含默认值) */
    _emptyCurveForm() {
      return { curveDate: '', source: 'ECB', theta0: 0, theta1: 0, theta2: 0, theta3: 0, lambda1: 1, lambda2: 5, description: '' }
    },

    /**
     * <p>状态 → Element UI tag 类型</p>
     *
     * @param {string} s 状态 (DRAFT/READY/ARCHIVED)
     * @returns {string} tag 类型
     */
    statusType(s) { return this.STATUS_TYPES[s] || 'info' },
    /**
     * <p>状态 → 中文标签</p>
     *
     * @param {string} s 状态
     * @returns {string} 中文标签
     */
    statusLabel(s) { return this.STATUS_LABELS[s] || s },
    /**
     * <p>运行类型 → 中文标签</p>
     *
     * @param {string} t 类型 (PCA_FIT/HJM_GENERATE/SCENARIO_GENERATE)
     * @returns {string} 中文标签
     */
    runTypeLabel(t) { return this.RUN_TYPES[t] ? this.RUN_TYPES[t].label : t },
    /**
     * <p>运行类型 → tag 颜色</p>
     *
     * @param {string} t 类型
     * @returns {string} tag 类型
     */
    runTypeColor(t) { return this.RUN_TYPES[t] ? this.RUN_TYPES[t].type : 'info' },

    /** 重置方案筛选条件 */
    resetFilter() { this.schemeFilter = { keyword: '', status: '' }; this.loadSchemes() },

    // ===== 方案 =====
    /**
     * <p>按当前筛选条件加载方案分页</p>
     *
     * @returns {Promise<void>}
     */
    async loadSchemes() {
      this.loading.schemes = true
      try {
        const resp = await api.listSchemes({ ...this.schemeFilter, page: this.schemesResp.page, pageSize: this.schemesResp.pageSize })
        this.schemes = resp.items
        this.schemesResp.total = resp.total
      } catch (e) { this.$message.error('加载方案失败: ' + (e.message || '')) }
      finally { this.loading.schemes = false }
    },

    /**
     * <p>打开方案查看/编辑弹窗 (row 不传则新建)</p>
     *
     * @param {Object} [row] 方案行, 不传则新增
     * @returns {void}
     */
    openSchemeDialog(row) {
      if (row) {
        this.schemeDialog.viewOnly = true
        this.schemeDialog.id = row.id
        this.schemeDialog.form = {
          schemeCode: row.schemeCode, schemeName: row.schemeName, description: row.description || '',
          dataSource: row.dataSource, startDate: row.startDate, endDate: row.endDate,
          nFactors: row.nFactors, nScenarios: row.nScenarios, nSteps: row.nSteps, seed: row.seed, status: row.status,
          maturitiesMonthsStr: (row.maturitiesMonths || []).join(','),
          initialYieldsPctStr: (row.initialYieldsPct || []).join(',')
        }
      } else {
        this.schemeDialog.viewOnly = false
        this.schemeDialog.id = null
        this.schemeDialog.form = this._emptySchemeForm()
      }
      this.schemeDialog.visible = true
    },

    /**
     * <p>提交方案弹窗 (新增或更新), 自动把逗号字符串解析为数组</p>
     *
     * @returns {Promise<void>}
     */
    async submitScheme() {
      const f = this.schemeDialog.form
      if (!f.schemeCode || !f.schemeName) return this.$message.warning('方案代码/名称必填')
      const body = {
        schemeCode: f.schemeCode, schemeName: f.schemeName, description: f.description,
        dataSource: f.dataSource, startDate: f.startDate, endDate: f.endDate,
        nFactors: f.nFactors, nScenarios: f.nScenarios, nSteps: f.nSteps,
        seed: f.seed, status: f.status,
        maturitiesMonths: f.maturitiesMonthsStr.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
      }
      if (f.initialYieldsPctStr) {
        body.initialYieldsPct = f.initialYieldsPctStr.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x))
      }
      try {
        if (this.schemeDialog.id) {
          await api.updateScheme(this.schemeDialog.id, body)
          this.$message.success('更新成功')
        } else {
          await api.createScheme(body)
          this.$message.success('创建成功')
        }
        this.schemeDialog.visible = false
        this.loadSchemes()
      } catch (e) { this.$message.error('保存失败: ' + (e.message || '')) }
    },

    /**
     * <p>打开克隆方案弹窗, 默认 code 加 _COPY 后缀, name 加 (副本)</p>
     *
     * @param {Object} row 源方案行
     * @returns {void}
     */
    openCloneDialog(row) {
      this.cloneDialog = { visible: true, srcId: row.id, newCode: row.schemeCode + '_COPY', newName: row.schemeName + ' (副本)' }
    },

    /**
     * <p>提交克隆方案</p>
     *
     * @returns {Promise<void>}
     */
    async submitClone() {
      if (!this.cloneDialog.newCode) return this.$message.warning('新方案代码必填')
      try {
        await api.cloneScheme(this.cloneDialog.srcId, {
          newSchemeCode: this.cloneDialog.newCode, newSchemeName: this.cloneDialog.newName
        })
        this.$message.success('克隆成功')
        this.cloneDialog.visible = false
        this.loadSchemes()
      } catch (e) { this.$message.error('克隆失败: ' + (e.message || '')) }
    },

    /**
     * <p>删除方案 (带 confirm 二次确认)</p>
     *
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async onDeleteScheme(row) {
      try {
        await this.$confirm(`确定删除方案 ${row.schemeCode}?`, '警告', { type: 'warning' })
      } catch (e) { return }
      try {
        await api.deleteScheme(row.id)
        this.$message.success('删除成功')
        this.loadSchemes()
      } catch (e) { this.$message.error('删除失败: ' + (e.message || '')) }
    },

    /**
     * <p>执行命令 (下拉菜单): fit-pca / generate-hjm / generate / run-all</p>
     *
     * @param {string} cmd 命令 key
     * @param {Object} row 方案行
     * @returns {Promise<void>}
     */
    async onSchemeCmd(cmd, row) {
      try {
        let resp
        if (cmd === 'fit-pca') { resp = await api.fitPca(row.id, {}) }
        else if (cmd === 'generate-hjm') { resp = await api.generateHjm(row.id, {}) }
        else if (cmd === 'generate') { resp = await api.generateScenarios(row.id, {}) }
        else if (cmd === 'run-all') { resp = await api.runAll(row.id) }
        this.$message.success(`执行成功：${JSON.stringify(resp).substring(0, 100)}`)
        this.loadSchemes()
      } catch (e) { this.$message.error('执行失败: ' + (e.message || '')) }
    },

    /**
     * <p>一键演示: 创建/复用 PRCP_ESG_DEMO_001 方案并跑三步</p>
     *
     * @returns {Promise<void>}
     */
    async onCaseRun() {
      try { await this.$confirm('一键演示将创建/复用 PRCP_ESG_DEMO_001 方案并跑三步，是否继续?', '确认', { type: 'info' }) } catch (e) { return }
      try {
        const resp = await api.caseRun({})
        this.$message.success(`一键演示完成：scenarioCode=${resp.scenarioCode}, scId=${resp.scId}`)
        this.loadSchemes()
      } catch (e) { this.$message.error('演示失败: ' + (e.message || '')) }
    },

    // ===== 曲线 =====
    /**
     * <p>加载曲线列表 (固定 pageSize=50)</p>
     *
     * @returns {Promise<void>}
     */
    async loadCurves() {
      this.loading.curves = true
      try {
        const resp = await api.listCurves({ ...this.curveFilter, page: 1, pageSize: 50 })
        this.curves = resp.items
      } catch (e) { this.$message.error('加载曲线失败: ' + (e.message || '')) }
      finally { this.loading.curves = false }
    },
    /** 加载曲线数据源汇总 (用于筛选下拉) */
    async loadCurveSources() {
      try { const r = await api.curveSources(); this.curveSourcesItems = r.items || [] } catch (e) {}
    },
    /** 打开新增曲线弹窗 */
    openCurveDialog() {
      this.curveDialog.form = this._emptyCurveForm()
      this.curveDialog.visible = true
    },
    /** 提交曲线弹窗 (upsert 单条) */
    async submitCurve() {
      const f = this.curveDialog.form
      if (!f.curveDate) return this.$message.warning('曲线日必填')
      try {
        await api.upsertCurve({ ...f })
        this.$message.success('保存成功')
        this.curveDialog.visible = false
        this.loadCurves()
      } catch (e) { this.$message.error('保存失败: ' + (e.message || '')) }
    },
    /** 打开批量导入曲线弹窗 */
    openBulkDialog() { this.bulkDialog = { visible: true, json: '[]' } },
    /** 提交批量导入 (JSON 数组) */
    async submitBulk() {
      try {
        const points = JSON.parse(this.bulkDialog.json)
        if (!Array.isArray(points) || !points.length) throw new Error('必须为非空数组')
        const r = await api.bulkUpsertCurves({ points })
        this.$message.success(`批量导入：成功 ${r.success}，失败 ${r.failed}`)
        this.bulkDialog.visible = false
        this.loadCurves()
      } catch (e) { this.$message.error('批量导入失败: ' + (e.message || '')) }
    },
    /** 打开单日利率还原弹窗 */
    openRatesDialog() { this.ratesDialog.result = []; this.ratesDialog.visible = true },
    /** 按期限列表还原单日利率 (从 Svensson 参数推算) */
    async computeRates() {
      try {
        const tenors = this.ratesDialog.tenors.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
        const r = await api.svenssonRates(this.ratesDialog.curveDate, {
          tenors, source: this.ratesDialog.source
        })
        // 展平为利率行
        const rows = []
        for (const it of (r.items || [])) {
          for (let i = 0; i < it.tenorsMonths.length; i++) {
            rows.push({ tenor: it.tenorsMonths[i], ratePct: it.ratesPct[i], rateDec: it.ratesDecimal[i] })
          }
        }
        this.ratesDialog.result = rows
      } catch (e) { this.$message.error('还原失败: ' + (e.message || '')) }
    },

    // ===== Run =====
    /** 加载运行历史 */
    async loadAllRuns() {
      this.loading.runs = true
      try {
        const r = await api.listAllRuns({ ...this.runFilter, page: 1, pageSize: 50 })
        this.allRuns = r.items
      } catch (e) { this.$message.error('加载失败: ' + (e.message || '')) }
      finally { this.loading.runs = false }
    },
    /**
     * <p>打开运行详情弹窗 (含 params / output JSON)</p>
     *
     * @param {Object} row 运行行
     * @returns {Promise<void>}
     */
    async openRunDialog(row) {
      this.runDialog = { visible: true, data: row }
      try {
        const r = await api.getRun(row.id)
        this.runDialog.data = r
      } catch (e) {}
    },

    // ===== 情景集 =====
    /** 按当前筛选条件加载情景集分页 */
    async loadScenarios() {
      this.loading.scenarios = true
      try {
        const r = await api.listScenarios({ ...this.scenarioFilter, page: this.scenariosResp.page, pageSize: this.scenariosResp.pageSize })
        this.scenarios = r.items
        this.scenariosResp.total = r.total
      } catch (e) { this.$message.error('加载失败: ' + (e.message || '')) }
      finally { this.loading.scenarios = false }
    },

    /**
     * <p>情景集下载链接 (供 a 标签 href 使用)</p>
     *
     * @param {string} code 情景代码
     * @returns {string} 下载 URL
     */
    downloadScenarioUrl(code) { return api.downloadScenarioUrl(code) },

    /**
     * <p>打开情景统计弹窗 (4 个 el-statistic + 终期分布表 + 折线图)</p>
     *
     * @param {Object} row 情景集行
     * @returns {Promise<void>}
     */
    async openStatsDialog(row) {
      this.statsDialog = { visible: true, code: row.scenarioCode, data: {}, maturities: [] }
      this.loading.stats = true
      try {
        const r = await api.getScenarioStats(row.scenarioCode)
        this.statsDialog.data = r
        this.statsDialog.maturities = r.maturitiesMonths || []
        // 终期分布表
        this.finalDistTable = (r.finalMean || []).map((m, i) => ({
          maturity: this.statsDialog.maturities[i] || i,
          mean: Number(m).toFixed(4),
          std: Number(r.finalStd[i] || 0).toFixed(4),
          min: Number(r.finalMin[i] || 0).toFixed(4),
          max: Number(r.finalMax[i] || 0).toFixed(4)
        }))
        await this.$nextTick()
        this.renderStatsChart()
      } catch (e) { this.$message.error('加载统计失败: ' + (e.message || '')) }
      finally { this.loading.stats = false }
    },

    /** 渲染情景统计折线图 (终期 min/mean/max) */
    async renderStatsChart() {
      const echarts = await import('echarts')
      const dom = this.$refs.statsChart
      if (!dom) return
      const chart = echarts.init(dom)
      const labels = this.statsDialog.maturities.map(m => m + '月')
      chart.setOption({
        title: { text: '终期利率分布（5 百分位带）', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['最小', '均值', '最大'], bottom: 0 },
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value', name: '%' },
        series: [
          { name: '最小', type: 'line', data: this.statsDialog.data.finalMin, smooth: true },
          { name: '均值', type: 'line', data: this.statsDialog.data.finalMean, smooth: true, lineStyle: { width: 3 } },
          { name: '最大', type: 'line', data: this.statsDialog.data.finalMax, smooth: true }
        ]
      })
    },

    // ===== 缓存 =====
    /** 加载内存缓存诊断信息 (JSON 展示) */
    async loadCache() {
      this.loading.cache = true
      try { this.cacheData = await api.cacheInfo() } catch (e) { this.$message.error('加载失败: ' + (e.message || '')) }
      finally { this.loading.cache = false }
    }
  },

  watch: {
    activeTab(v) {
      if (v === 'curves') this.loadCurves()
      else if (v === 'runs') this.loadAllRuns()
      else if (v === 'scenarios') this.loadScenarios()
      else if (v === 'cache') this.loadCache()
    }
  }
}
</script>

<style scoped>
.esg-page { padding: 12px; }
.pager { text-align: right; margin-top: 12px; }
.cache-pre { background: #f5f5f5; padding: 12px; font-size: 12px; max-height: 600px; overflow: auto; }
.stats-chart { width: 100%; height: 280px; margin-bottom: 12px; }

/* 文字按钮下拉触发器（克制蓝） */
.el-dropdown-link {
  display: inline-block;
  cursor: pointer;
  color: #606266;
  font-size: 12px;
  padding: 0 4px;
  user-select: none;
}
.el-dropdown-link:hover { color: var(--el-color-primary, #0B6FF2); }
.link-primary { color: var(--el-color-primary, #0B6FF2); }
.link-primary i { margin-right: 2px; }
</style>