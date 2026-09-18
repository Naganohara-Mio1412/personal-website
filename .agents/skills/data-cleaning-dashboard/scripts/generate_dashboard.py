"""Generate a fully offline, single-file interactive data dashboard."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from jinja2 import Template
from plotly.offline import get_plotlyjs

from profile_data import profile_dataset

LOGGER = logging.getLogger(__name__)
PREVIEW_LIMIT = 2000
PLOTLY_URL_PATTERN = re.compile(r"https?://[^\s\"'<>\\)]+", re.IGNORECASE)
W3C_NAMESPACE_PREFIXES = ("http://www.w3.org/", "https://www.w3.org/")

HTML_TEMPLATE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none';">
<title>Offline Data Cleaning Dashboard</title>
<style>
:root{--bg:#f6f8fb;--panel:#fff;--border:#e6eaf0;--border-strong:#d5dbe5;--text-primary:#172033;--text-secondary:#687386;--accent:#2563eb;--accent-hover:#1d4ed8;--accent-soft:#eff6ff;--success:#15803d;--success-soft:#f0fdf4;--warning:#b45309;--warning-soft:#fffbeb;--danger:#c2413a;--danger-soft:#fef2f2;--neutral-soft:#f8fafc;--shadow:0 1px 2px rgba(23,32,51,.04)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text-primary);font:14px/1.5 Inter,"Segoe UI","Microsoft YaHei","PingFang SC",Arial,sans-serif}button,input,select{font:inherit}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid rgba(37,99,235,.16);outline-offset:1px}[hidden]{display:none!important}.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.app-header{position:sticky;top:0;z-index:50;background:var(--panel);border-bottom:1px solid var(--border)}.header-inner{min-height:72px;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:12px;min-width:0}.brand-mark{width:36px;height:36px;border-radius:10px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;letter-spacing:.04em}.brand h1{margin:0;font-size:23px;line-height:1.2;font-weight:680;letter-spacing:-.02em}.brand p{margin:3px 0 0;color:var(--text-secondary);font-size:12px}.header-meta{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap}.meta-chip{min-height:34px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--neutral-soft);color:var(--text-secondary);font-size:12px;white-space:nowrap}.meta-chip strong{color:var(--text-primary);font-weight:650}.mode-badge{background:var(--success-soft);border-color:#bbf7d0;color:var(--success);font-weight:700;letter-spacing:.04em}
.nav-shell{position:sticky;top:72px;z-index:45;background:rgba(246,248,251,.96);border-bottom:1px solid var(--border);padding:0 24px}.tabs{display:flex;gap:4px;max-width:none;overflow-x:auto}.tab-button{height:44px;padding:0 15px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-secondary);cursor:pointer;font-weight:600;white-space:nowrap}.tab-button:hover{color:var(--text-primary)}.tab-button.active{color:var(--accent);border-bottom-color:var(--accent)}
main{padding:20px 24px 32px;max-width:none;margin:0 auto}.tab-panel{display:none}.tab-panel.active{display:block}.section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}.section-head h2,.panel-title{margin:0;font-size:17px;font-weight:680;letter-spacing:-.01em}.section-head p,.panel-subtitle{margin:4px 0 0;color:var(--text-secondary);font-size:13px}.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow)}.panel-body{padding:16px}.section-gap{margin-top:16px}.muted{color:var(--text-secondary)}
.control,label.control{display:flex;flex-direction:column;gap:5px;color:var(--text-secondary);font-size:12px;font-weight:550}input,select,button.control-button{height:36px;border:1px solid var(--border-strong);border-radius:8px;background:#fff;color:var(--text-primary);padding:0 11px;transition:border-color .14s,background .14s,color .14s}input:hover,select:hover{border-color:#b9c2d0}input:focus,select:focus{border-color:var(--accent)}button.control-button{cursor:pointer;font-weight:620}button.control-button:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}button.control-button.primary{background:var(--accent);border-color:var(--accent);color:#fff}button.control-button.primary:hover{background:var(--accent-hover);color:#fff}button:disabled{cursor:not-allowed;opacity:.48}.select-compact{min-width:150px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.kpi-card{padding:15px 16px;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);min-height:104px}.kpi-top{display:flex;align-items:center;justify-content:space-between;color:var(--text-secondary);font-size:12px}.kpi-icon{width:28px;height:28px;border-radius:8px;background:var(--neutral-soft);display:grid;place-items:center;color:var(--text-secondary);font-weight:700}.kpi-value{display:block;margin-top:8px;font-size:27px;line-height:1.08;font-weight:720;letter-spacing:-.025em}.kpi-note{display:block;margin-top:5px;color:var(--text-secondary);font-size:12px}.status-good{color:var(--success)}.status-warn{color:var(--warning)}.status-bad{color:var(--danger)}
.overview-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.55fr);gap:16px}.quality-list{display:grid;gap:10px;margin-top:14px}.quality-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--neutral-soft)}.quality-row span:last-child{font-weight:680}.dataset-detail{display:grid;gap:12px}.detail-row{display:flex;justify-content:space-between;gap:18px;padding-bottom:10px;border-bottom:1px solid var(--border)}.detail-row:last-child{padding-bottom:0;border-bottom:0}.detail-row span:first-child{color:var(--text-secondary)}
.change-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;margin-top:14px}.change-card{border:1px solid var(--border);border-radius:10px;padding:12px 13px;background:var(--neutral-soft)}.change-label{color:var(--text-secondary);font-size:12px}.change-values{margin-top:5px;font-size:18px;font-weight:680}.change-delta{margin-top:3px;font-size:12px}.change-card.improved{background:var(--success-soft);border-color:#dcfce7}.change-card.improved .change-delta{color:var(--success)}.change-card.worse{background:var(--danger-soft);border-color:#fee2e2}.change-card.worse .change-delta{color:var(--danger)}
.field-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:start}.field-sidebar{position:sticky;top:132px;max-height:calc(100vh - 152px);display:flex;flex-direction:column;overflow:hidden}.sidebar-head{padding:15px 15px 10px;display:flex;justify-content:space-between;align-items:center}.sidebar-head h2{font-size:16px;margin:0}.count-badge{min-width:27px;height:25px;padding:0 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:12px;font-weight:700}.field-search{margin:0 12px 10px;width:calc(100% - 24px)}.field-list{display:flex;flex-direction:column;gap:3px;padding:0 8px 10px;overflow-y:auto}.field-item{position:relative;width:100%;min-height:54px;padding:8px 10px 8px 13px;border:0;border-radius:8px;background:transparent;text-align:left;color:var(--text-primary);cursor:pointer}.field-item:before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:3px;background:transparent}.field-item:hover{background:var(--neutral-soft)}.field-item.active{background:var(--accent-soft);color:var(--accent)}.field-item.active:before{background:var(--accent)}.field-name{display:block;font-weight:620;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.field-meta{display:flex;align-items:center;gap:6px;margin-top:4px;color:var(--text-secondary);font-size:12px}.type-badge{display:inline-flex;align-items:center;height:20px;padding:0 6px;border:1px solid var(--border);border-radius:5px;background:#fff;color:var(--text-secondary);font-size:12px;font-weight:680}.field-item.active .type-badge{border-color:#bfdbfe;color:var(--accent)}
.field-content{min-width:0}.field-header{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;padding:16px 18px 14px;border-bottom:1px solid var(--border)}.field-title-line{display:flex;align-items:center;gap:9px}.field-title-line h2{margin:0;font-size:20px}.field-header p{margin:4px 0 0;color:var(--text-secondary);font-size:12px}.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0;padding:6px 8px}.metric{min-height:75px;padding:12px;border-right:1px solid var(--border)}.metric:last-child{border-right:0}.metric span{color:var(--text-secondary);font-size:12px}.metric b{display:block;margin-top:4px;font-size:18px;font-weight:680;overflow:hidden;text-overflow:ellipsis}.chart-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:16px}.chart-card{overflow:hidden}.chart-head{min-height:52px;padding:11px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px}.chart-head h3{margin:0;font-size:15px}.segmented{display:flex;padding:3px;border-radius:8px;background:var(--neutral-soft);border:1px solid var(--border)}.segment-button{height:29px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer}.segment-button.active{background:#fff;color:var(--accent);box-shadow:0 1px 2px rgba(23,32,51,.08)}.plot{height:338px;min-height:300px}.quality-aside{display:grid;grid-template-rows:auto minmax(0,1fr);gap:16px}.missing-block{padding:16px}.missing-top{display:flex;justify-content:space-between;align-items:flex-end}.missing-value{font-size:27px;line-height:1;font-weight:720}.progress{height:8px;border-radius:999px;background:#edf0f4;margin-top:12px;overflow:hidden}.progress-bar{height:100%;background:var(--danger);border-radius:inherit;min-width:0}.missing-caption{margin-top:8px;color:var(--text-secondary);font-size:12px}.top-values{max-height:273px;overflow:auto}.compact-table{border-collapse:collapse;width:100%;table-layout:fixed}.compact-table th,.compact-table td{padding:8px 11px;border-bottom:1px solid var(--border);font-size:12px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.compact-table th{position:sticky;top:0;background:var(--neutral-soft);z-index:1;color:var(--text-secondary);font-weight:620}.compact-table th:nth-child(n+2),.compact-table td:nth-child(n+2){text-align:right}.empty-inline{padding:35px 16px;text-align:center;color:var(--text-secondary)}
.relationship-panel{min-height:410px}.relation-controls,.table-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.relation-controls{padding:14px 16px;border-bottom:1px solid var(--border)}.relation-controls .control{min-width:190px}.relationship-plot{height:348px}.chart-empty{height:300px;display:grid;place-items:center;color:var(--text-secondary);text-align:center}.empty-graphic{width:90px;height:58px;margin:0 auto 13px;display:flex;align-items:flex-end;justify-content:center;gap:7px;border-bottom:1px solid var(--border-strong)}.empty-graphic i{display:block;width:11px;border-radius:3px 3px 0 0;background:#dbe5f5}.empty-graphic i:nth-child(1){height:22px}.empty-graphic i:nth-child(2){height:42px}.empty-graphic i:nth-child(3){height:31px}.empty-graphic i:nth-child(4){height:50px}
.table-panel{overflow:hidden}.table-toolbar{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-end;justify-content:space-between;gap:14px}.table-controls{flex:1}.search-control{flex:1;min-width:210px}.filter-value{min-width:150px}.record-count{font-weight:680;white-space:nowrap}.table-wrap{max-height:600px;overflow:auto}.data-table{border-collapse:separate;border-spacing:0;width:100%;white-space:nowrap}.data-table th,.data-table td{height:41px;padding:8px 12px;border-bottom:1px solid var(--border);max-width:300px;overflow:hidden;text-overflow:ellipsis}.data-table th{position:sticky;top:0;z-index:2;background:#f3f6fa;color:var(--text-secondary);font-size:12px;font-weight:680;text-align:left}.data-table td{background:#fff}.data-table tr:hover td{background:#f8fbff}.data-table .cell-number{text-align:right;font-variant-numeric:tabular-nums}.data-table .cell-date{text-align:left;font-variant-numeric:tabular-nums}.pagination{min-height:56px;padding:9px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border)}.page-actions{display:flex;align-items:center;gap:9px}.page-size{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:12px}.page-size select{width:74px}.no-records td{text-align:center!important;color:var(--text-secondary);padding:30px!important}
@media(max-width:1100px){.overview-grid{grid-template-columns:1fr}.chart-grid{grid-template-columns:minmax(0,1.7fr) minmax(250px,1fr)}.change-grid{grid-template-columns:repeat(2,1fr)}.header-meta .generated-chip{display:none}}
@media(max-width:900px){.header-inner{align-items:flex-start}.header-meta{max-width:48%}.field-layout{grid-template-columns:1fr}.field-sidebar{position:static;max-height:255px}.field-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.chart-grid{grid-template-columns:1fr}.quality-aside{grid-template-columns:1fr 1fr;grid-template-rows:auto}.metric-grid{grid-template-columns:repeat(2,1fr)}.metric:nth-child(2n){border-right:0}.table-toolbar{align-items:flex-start;flex-direction:column}.record-count{align-self:flex-end}}
@media(max-width:600px){.header-inner{padding:10px 14px;display:block}.header-meta{max-width:none;justify-content:flex-start;margin-top:9px}.header-meta .row-chip,.header-meta .generated-chip{display:none}.nav-shell{top:104px;padding:0 12px}main{padding:14px 12px 24px}.kpi-grid,.change-grid{grid-template-columns:1fr}.overview-grid{display:block}.overview-grid>*+*{margin-top:14px}.field-list{grid-template-columns:1fr}.quality-aside{grid-template-columns:1fr}.metric-grid{grid-template-columns:1fr}.metric{border-right:0;border-bottom:1px solid var(--border)}.relation-controls .control{width:100%}.relation-controls button{width:100%}.table-controls>*{width:100%}.pagination{align-items:flex-start;flex-direction:column}.page-actions{width:100%;justify-content:space-between}.brand h1{font-size:20px}}
</style>
<script>{{ plotly_js }}</script>
</head>
<body>
<header class="app-header">
  <div class="header-inner">
    <div class="brand"><div class="brand-mark" aria-hidden="true">DQ</div><div><h1>数据清洗与质量看板</h1><p>Data Cleaning &amp; Quality Dashboard</p></div></div>
    <div class="header-meta">
      <label class="control"><span class="sr-only">当前工作表</span><select id="datasetSelect" class="select-compact" aria-label="当前工作表"></select></label>
      <span id="modeBadge" class="meta-chip mode-badge">SAFE MODE</span>
      <span id="headerRows" class="meta-chip row-chip"></span>
      <span id="generatedAt" class="meta-chip generated-chip"></span>
    </div>
  </div>
</header>
<nav class="nav-shell" aria-label="看板模块">
  <div class="tabs" role="tablist">
    <button class="tab-button active" role="tab" aria-selected="true" aria-controls="overviewPanel" data-tab="overviewPanel">概览</button>
    <button class="tab-button" role="tab" aria-selected="false" aria-controls="fieldPanel" data-tab="fieldPanel">字段分析</button>
    <button class="tab-button" role="tab" aria-selected="false" aria-controls="relationPanel" data-tab="relationPanel">关系分析</button>
    <button class="tab-button" role="tab" aria-selected="false" aria-controls="tablePanel" data-tab="tablePanel">数据表</button>
  </div>
</nav>
<main>
  <section id="overviewPanel" class="tab-panel active" role="tabpanel">
    <div class="section-head"><div><h2>数据集概览</h2><p>快速查看数据规模、质量状态与清洗影响</p></div></div>
    <div id="summaryCards" class="kpi-grid"></div>
    <div class="overview-grid section-gap">
      <section class="panel"><div class="panel-body"><h2 class="panel-title">清洗摘要</h2><p class="panel-subtitle">safe 模式仅执行确定性修改，不删除异常值或填补业务缺失值</p><div id="changes" class="change-grid"></div></div></section>
      <aside class="panel"><div class="panel-body"><h2 class="panel-title">数据质量提示</h2><div id="qualitySummary" class="quality-list"></div></div></aside>
    </div>
    <section class="panel section-gap"><div class="panel-body dataset-detail"><div class="detail-row"><span>当前数据集</span><strong id="overviewDataset"></strong></div><div class="detail-row"><span>嵌入数据</span><strong id="previewNote"></strong></div><div class="detail-row"><span>完整数据</span><strong>cleaned_data.xlsx 与 CSV 输出</strong></div></div></section>
  </section>

  <section id="fieldPanel" class="tab-panel" role="tabpanel">
    <div class="field-layout">
      <aside class="panel field-sidebar"><div class="sidebar-head"><h2>字段</h2><span id="fieldCount" class="count-badge"></span></div><input id="fieldSearch" class="field-search" placeholder="搜索字段..." aria-label="搜索字段"><div id="fieldList" class="field-list"></div></aside>
      <div class="field-content">
        <section class="panel"><div class="field-header"><div><div class="field-title-line"><h2 id="fieldTitle">选择字段</h2><span id="fieldType" class="type-badge"></span></div><p id="fieldDtype"></p></div></div><div id="fieldMetrics" class="metric-grid"></div></section>
        <div class="chart-grid section-gap">
          <section class="panel chart-card"><div class="chart-head"><h3 id="fieldChartTitle">字段分布</h3><div id="numericChartTabs" class="segmented" hidden><button class="segment-button active" data-chart="distribution">分布</button><button class="segment-button" data-chart="box">箱线图</button></div></div><div id="fieldChart" class="plot"></div></section>
          <aside class="quality-aside">
            <section class="panel missing-block"><div class="missing-top"><div><div class="muted">缺失率</div><div id="missingValue" class="missing-value">0%</div></div><strong id="missingCount">0 个</strong></div><div class="progress" aria-label="缺失率"><div id="missingBar" class="progress-bar"></div></div><div id="missingCaption" class="missing-caption"></div></section>
            <section class="panel"><div class="chart-head"><h3>高频值</h3><span class="muted">最多 15 项</span></div><div id="topValues" class="top-values"></div></section>
          </aside>
        </div>
      </div>
    </div>
  </section>

  <section id="relationPanel" class="tab-panel" role="tabpanel">
    <div class="section-head"><div><h2>关系分析</h2><p>按字段类型自动选择散点图、趋势图或分类汇总图</p></div></div>
    <section class="panel relationship-panel"><div class="relation-controls"><label class="control">X 字段<select id="relationX"></select></label><label class="control">Y 字段<select id="relationY"></select></label><label class="control">图表类型<select id="relationType" disabled><option>自动</option></select></label><button id="relationBtn" class="control-button primary">生成图表</button></div><div id="relationshipChart" class="relationship-plot"><div class="chart-empty"><div><div class="empty-graphic" aria-hidden="true"><i></i><i></i><i></i><i></i></div><strong>选择两个字段开始关系分析</strong><div class="muted">支持 NUMBER × NUMBER、DATE × NUMBER、CATEGORY × NUMBER</div></div></div></div></section>
  </section>

  <section id="tablePanel" class="tab-panel" role="tabpanel">
    <div class="section-head"><div><h2>数据记录</h2><p id="tablePreviewNote"></p></div></div>
    <section class="panel table-panel"><div class="table-toolbar"><div class="table-controls"><label class="control search-control">搜索全部数据<input id="searchInput" placeholder="输入关键字"></label><label class="control">字段<select id="filterField"></select></label><label class="control">条件<select id="filterCondition"></select></label><label class="control filter-value">值<input id="filterValue" placeholder="输入筛选值"></label><label id="filterMaxWrap" class="control filter-value" hidden>最大值<input id="filterValueMax" type="number" step="any" placeholder="最大值"></label><button id="clearFilters" class="control-button">清除筛选</button></div><div id="recordCount" class="record-count"></div></div><div class="table-wrap"><table id="dataTable" class="data-table"></table></div><div class="pagination"><label class="page-size">每页<select id="pageSize"><option value="10">10</option><option value="25" selected>25</option><option value="50">50</option><option value="100">100</option></select></label><div class="page-actions"><button id="prevPage" class="control-button">‹ 上一页</button><span id="pageInfo" class="muted"></span><button id="nextPage" class="control-button">下一页 ›</button></div></div></section>
  </section>
</main>
<script>
const DASHBOARD_DATA={{ payload_json }};
const PLOT_CONFIG={responsive:true,displaylogo:false,displayModeBar:false};
let state={dataset:null,field:null,filtered:[],page:1,pageSize:25,fieldChartMode:'distribution',kinds:{}};
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('zh-CN');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=()=>DASHBOARD_DATA.datasets[state.dataset];
const currentFields=()=>current().profile.fields;
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label??value;return o}
function fillSelect(el,values,blank){el.innerHTML='';if(blank!==undefined)el.append(option('',blank));values.forEach(v=>el.append(option(v)));}
function fillOptions(el,items){el.innerHTML='';items.forEach(item=>el.append(option(item.value,item.label)));}
function debounce(fn,delay=180){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay)}}
function parseDashboardDate(value){
  if(value===null||value===undefined||value==='')return null;
  const match=String(value).trim().match(/^(\d{4})[-\/_](\d{1,2})(?:[-\/_](\d{1,2}))?(?:[T ].*)?$/);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]||1);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.getTime():null;
}
function classifyFields(){
  state.kinds={};
  currentFields().forEach(field=>{
    if(field.kind==='numeric')state.kinds[field.column]='number';
    else if(field.kind==='datetime')state.kinds[field.column]='date';
    else if(field.kind==='boolean')state.kinds[field.column]='boolean';
    else{
      const values=current().rows.map(row=>row[field.column]).filter(value=>value!==null&&value!==undefined&&value!=='');
      const parsed=values.filter(value=>parseDashboardDate(value)!==null).length;
      state.kinds[field.column]=values.length&&parsed/values.length>=.8?'date':field.kind==='category'?'category':'text';
    }
  });
}
function kindOf(name){return state.kinds[name]||'text'}
function kindLabel(name){return({number:'NUMBER',date:'DATE',boolean:'BOOLEAN',category:'CATEGORY',text:'TEXT'})[kindOf(name)]||'TEXT'}
function fieldByName(name){return currentFields().find(field=>field.column===name)}
function baseLayout(height=338){return{height,margin:{t:22,b:58,l:58,r:22},paper_bgcolor:'#ffffff',plot_bgcolor:'#ffffff',font:{family:'Inter, Segoe UI, Microsoft YaHei, Arial, sans-serif',size:12,color:'#687386'},xaxis:{gridcolor:'#eef1f5',zerolinecolor:'#e6eaf0',automargin:true},yaxis:{gridcolor:'#eef1f5',zerolinecolor:'#e6eaf0',automargin:true},showlegend:false,hoverlabel:{bgcolor:'#172033',font:{color:'#fff'}}}}
function renderPlot(id,traces,layout){Plotly.newPlot(id,traces,layout,PLOT_CONFIG)}
function formatMetric(value){if(value===null||value===undefined||value==='')return '—';return typeof value==='number'?value.toLocaleString('zh-CN',{maximumFractionDigits:4}):String(value)}
function setActiveTab(panelId){
  document.querySelectorAll('.tab-button').forEach(button=>{const active=button.dataset.tab===panelId;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===panelId));
  requestAnimationFrame(()=>document.querySelectorAll(`#${panelId} .js-plotly-plot`).forEach(plot=>Plotly.Plots.resize(plot)));
}
function init(){
  fillSelect($('datasetSelect'),Object.keys(DASHBOARD_DATA.datasets));
  $('datasetSelect').addEventListener('change',()=>loadDataset($('datasetSelect').value));
  document.querySelectorAll('.tab-button').forEach(button=>button.addEventListener('click',()=>setActiveTab(button.dataset.tab)));
  $('fieldSearch').addEventListener('input',filterFieldList);
  $('numericChartTabs').addEventListener('click',event=>{const button=event.target.closest('[data-chart]');if(!button)return;state.fieldChartMode=button.dataset.chart;document.querySelectorAll('.segment-button').forEach(item=>item.classList.toggle('active',item===button));renderFieldChart(fieldByName(state.field))});
  $('relationBtn').addEventListener('click',renderRelationship);
  $('searchInput').addEventListener('input',debounce(applyFilters));
  $('filterField').addEventListener('change',()=>{updateFilterConditions();applyFilters()});
  $('filterCondition').addEventListener('change',()=>{updateFilterValueState();applyFilters()});
  $('filterValue').addEventListener('input',debounce(applyFilters));$('filterValueMax').addEventListener('input',debounce(applyFilters));
  $('clearFilters').addEventListener('click',clearFilters);$('prevPage').addEventListener('click',()=>changePage(-1));$('nextPage').addEventListener('click',()=>changePage(1));
  $('pageSize').addEventListener('change',()=>{state.pageSize=Number($('pageSize').value);state.page=1;renderTable()});
  $('modeBadge').textContent=`${String(DASHBOARD_DATA.mode||'safe').toUpperCase()} MODE`;
  $('generatedAt').innerHTML=`生成于 <strong>${esc(DASHBOARD_DATA.generated_at_display||'—')}</strong>`;
  loadDataset(Object.keys(DASHBOARD_DATA.datasets)[0]);
}
function loadDataset(name){
  state.dataset=name;$('datasetSelect').value=name;state.fieldChartMode='distribution';classifyFields();
  const d=current(),o=d.profile.overview;
  $('headerRows').innerHTML=`<strong>${fmt(o.row_count)}</strong> 行 · <strong>${fmt(o.column_count)}</strong> 字段`;
  $('overviewDataset').textContent=name;
  $('previewNote').textContent=`${fmt(d.preview_rows)} / ${fmt(d.total_rows)} 行`;
  $('tablePreviewNote').textContent=`当前表格使用 ${fmt(d.preview_rows)} 行嵌入预览；完整数据保存在 cleaned_data.xlsx 和 CSV 文件中。`;
  renderKpis();renderChanges();renderQualitySummary();renderFieldList();renderRelationOptions();refreshFilterFields();
  state.filtered=d.rows.slice();state.page=1;renderTable();
  selectField(currentFields()[0]?.column);
  showRelationEmpty('选择两个字段开始关系分析','支持 NUMBER × NUMBER、DATE × NUMBER、CATEGORY × NUMBER');
}
function qualityStats(){
  const d=current(),o=d.profile.overview,suspected=d.profile.outliers.reduce((sum,item)=>sum+Number(item.suspected_count||0),0);
  const cellCount=Math.max(o.row_count*o.column_count,1),rowCount=Math.max(o.row_count,1);
  const score=Math.max(0,Math.round(100-(o.missing_cells/cellCount*55)-(o.duplicate_rows/rowCount*25)-(suspected/rowCount*20)));
  return{suspected,score,status:score>=95?'优秀':score>=80?'良好':'待处理',statusClass:score>=95?'status-good':score>=80?'status-warn':'status-bad'};
}
function renderKpis(){
  const o=current().profile.overview,q=qualityStats();
  const cards=[['总行数',o.row_count,'R','清洗后记录'],['字段数',o.column_count,'F','当前数据结构'],['缺失值',o.missing_cells,'M',o.missing_cells?'建议检查':'未发现缺失'],['重复记录',o.duplicate_rows,'D',o.duplicate_rows?'建议处理':'未发现重复'],['疑似异常',q.suspected,'!','仅标记，不删除'],['数据质量',`${q.score}%`,'Q',q.status,q.statusClass]];
  $('summaryCards').innerHTML=cards.map(card=>`<article class="kpi-card"><div class="kpi-top"><span>${card[0]}</span><span class="kpi-icon">${card[2]}</span></div><strong class="kpi-value ${card[5]||''}">${typeof card[1]==='number'?fmt(card[1]):esc(card[1])}</strong><span class="kpi-note ${card[5]||''}">${card[3]}</span></article>`).join('');
}
function renderChanges(){
  const c=current().comparison,items=[['记录数',c.before_rows,c.after_rows],['字段数',c.before_columns,c.after_columns],['缺失单元格',c.before_missing_cells,c.after_missing_cells],['重复记录',c.before_duplicate_rows,c.after_duplicate_rows]];
  $('changes').innerHTML=items.map(([label,before,after])=>{const delta=after-before,klass=delta<0?'improved':delta>0?'worse':'neutral',deltaText=delta===0?'无变化':`${delta>0?'+':''}${fmt(delta)}`;return`<article class="change-card ${klass}"><div class="change-label">${label}</div><div class="change-values">${fmt(before)} → ${fmt(after)}</div><div class="change-delta">${deltaText}</div></article>`}).join('');
}
function renderQualitySummary(){
  const o=current().profile.overview,q=qualityStats(),dateCandidates=currentFields().filter(field=>field.kind!=='datetime'&&kindOf(field.column)==='date').length;
  const items=[['缺失单元格',fmt(o.missing_cells)],['重复记录',fmt(o.duplicate_rows)],['疑似异常值',fmt(q.suspected)],['日期候选字段',fmt(dateCandidates)]];
  $('qualitySummary').innerHTML=items.map(item=>`<div class="quality-row"><span>${item[0]}</span><span>${item[1]}</span></div>`).join('');
}
function renderFieldList(){
  const list=$('fieldList');list.innerHTML='';$('fieldCount').textContent=currentFields().length;$('fieldSearch').value='';
  currentFields().forEach(field=>{const button=document.createElement('button');button.className='field-item';button.dataset.field=field.column;button.innerHTML=`<span class="field-name">${esc(field.column)}</span><span class="field-meta"><span class="type-badge">${kindLabel(field.column)}</span><span>缺失 ${(Number(field.missing_ratio)*100).toFixed(1)}%</span></span>`;button.addEventListener('click',()=>selectField(field.column));list.append(button)});
}
function filterFieldList(){const query=$('fieldSearch').value.trim().toLocaleLowerCase();document.querySelectorAll('.field-item').forEach(item=>item.hidden=query&&!item.dataset.field.toLocaleLowerCase().includes(query))}
function selectField(name){
  const f=fieldByName(name);if(!f)return;state.field=name;
  document.querySelectorAll('.field-item').forEach(button=>button.classList.toggle('active',button.dataset.field===name));
  $('fieldTitle').textContent=name;$('fieldType').textContent=kindLabel(name);$('fieldDtype').textContent=`原始分析类型：${f.kind} · 存储类型：${f.dtype}`;
  const metrics=[['非空值',fmt(f.non_null)],['缺失值',fmt(f.missing_count)],['唯一值',fmt(f.unique_count)]];
  if(kindOf(name)==='number')metrics.push(['最小值',formatMetric(f.min)],['最大值',formatMetric(f.max)],['平均值',formatMetric(f.mean)],['中位数',formatMetric(f.median)]);
  else if(kindOf(name)==='date'){
    const timestamps=current().rows.map(row=>parseDashboardDate(row[name])).filter(value=>value!==null).sort((a,b)=>a-b);
    metrics.push(['最早日期',timestamps.length?formatDateLabel(timestamps[0]):'—'],['最晚日期',timestamps.length?formatDateLabel(timestamps.at(-1)):'—']);
  }
  $('fieldMetrics').innerHTML=metrics.map(item=>`<div class="metric"><span>${item[0]}</span><b title="${esc(item[1])}">${esc(item[1])}</b></div>`).join('');
  const ratio=Number(f.missing_ratio||0)*100;$('missingValue').textContent=`${ratio.toFixed(2)}%`;$('missingCount').textContent=`${fmt(f.missing_count)} 个`;$('missingBar').style.width=`${Math.min(100,ratio)}%`;$('missingCaption').textContent=`共 ${fmt(f.rows)} 条记录，其中 ${fmt(f.non_null)} 条非空。`;
  state.fieldChartMode='distribution';document.querySelectorAll('.segment-button').forEach(button=>button.classList.toggle('active',button.dataset.chart==='distribution'));
  renderFieldChart(f);renderTopValues(f);
}
function frequencyEntries(name,limit=15){
  const counts=new Map();let nonNull=0;current().rows.forEach(row=>{const value=row[name];if(value===null||value===undefined||value==='')return;nonNull++;const key=String(value);counts.set(key,(counts.get(key)||0)+1)});
  const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]),top=sorted.slice(0,limit).map(([value,count])=>({value,count,ratio:count/Math.max(nonNull,1)}));
  if(sorted.length>limit){const other=sorted.slice(limit).reduce((sum,item)=>sum+item[1],0);top.push({value:'其他',count:other,ratio:other/Math.max(nonNull,1)})}
  return top;
}
function formatDateLabel(timestamp){const date=new Date(timestamp);return`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`}
function renderFieldChart(field){
  if(!field)return;const name=field.column,kind=kindOf(name),values=current().rows.map(row=>row[name]).filter(value=>value!==null&&value!==undefined&&value!=='');
  $('numericChartTabs').hidden=kind!=='number';
  if(kind==='number'){
    const nums=values.map(Number).filter(Number.isFinite),layout=baseLayout();
    if(state.fieldChartMode==='box'){$('fieldChartTitle').textContent='箱线图';layout.margin={t:22,b:45,l:35,r:25};renderPlot('fieldChart',[{x:nums,type:'box',orientation:'h',boxpoints:'outliers',marker:{color:'#2563eb'},line:{color:'#2563eb'},fillcolor:'#eff6ff',hovertemplate:'值 %{x}<extra></extra>'}],layout)}
    else{$('fieldChartTitle').textContent='数值分布';layout.xaxis.title=name;layout.yaxis.title='频数';renderPlot('fieldChart',[{x:nums,type:'histogram',marker:{color:'#2563eb',line:{color:'#ffffff',width:1}},hovertemplate:'区间 %{x}<br>频数 %{y}<extra></extra>'}],layout)}
  }else if(kind==='date'){
    $('fieldChartTitle').textContent='时间记录分布';const counts=new Map();values.forEach(value=>{const timestamp=parseDashboardDate(value);if(timestamp!==null)counts.set(timestamp,(counts.get(timestamp)||0)+1)});const ordered=[...counts.entries()].sort((a,b)=>a[0]-b[0]),layout=baseLayout();layout.xaxis.title=name;layout.yaxis.title='记录数';renderPlot('fieldChart',[{x:ordered.map(item=>formatDateLabel(item[0])),y:ordered.map(item=>item[1]),type:'scatter',mode:'lines+markers',line:{color:'#2563eb',width:2},marker:{color:'#2563eb',size:6},hovertemplate:'%{x}<br>记录 %{y}<extra></extra>'}],layout);
  }else{
    $('fieldChartTitle').textContent=kind==='text'?'高频文本值':'分类分布';const top=frequencyEntries(name),layout=baseLayout();layout.margin.b=90;layout.xaxis.title=name;layout.yaxis.title='频数';renderPlot('fieldChart',[{x:top.map(item=>item.value),y:top.map(item=>item.count),type:'bar',marker:{color:top.map(item=>item.value==='其他'?'#94a3b8':'#2563eb')},hovertemplate:'%{x}<br>频数 %{y}<extra></extra>'}],layout);
  }
}
function renderTopValues(field){const top=frequencyEntries(field.column);$('topValues').innerHTML=top.length?`<table class="compact-table"><thead><tr><th>值</th><th>频数</th><th>占比</th></tr></thead><tbody>${top.map(item=>`<tr><td title="${esc(item.value)}">${esc(item.value)}</td><td>${fmt(item.count)}</td><td>${(item.ratio*100).toFixed(2)}%</td></tr>`).join('')}</tbody></table>`:'<div class="empty-inline">无非空值</div>'}
function renderRelationOptions(){
  const fields=currentFields().map(field=>({value:field.column,label:`${field.column} · ${kindLabel(field.column)}`}));fillOptions($('relationX'),[{value:'',label:'选择字段'},...fields]);fillOptions($('relationY'),[{value:'',label:'选择字段'},...fields]);
}
function showRelationEmpty(title,detail){$('relationshipChart').innerHTML=`<div class="chart-empty"><div><div class="empty-graphic" aria-hidden="true"><i></i><i></i><i></i><i></i></div><strong>${esc(title)}</strong><div class="muted">${esc(detail)}</div></div></div>`}
function renderRelationship(){
  const x=$('relationX').value,y=$('relationY').value;if(!x||!y||x===y){showRelationEmpty('请选择两个不同字段','系统会根据字段类型自动选择图表');return}const xKind=kindOf(x),yKind=kindOf(y),rows=current().rows,layout=baseLayout(348);layout.margin.t=26;
  if(xKind==='number'&&yKind==='number'){
    const points=rows.map(row=>({x:Number(row[x]),y:Number(row[y])})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));layout.xaxis.title=x;layout.yaxis.title=y;renderPlot('relationshipChart',[{x:points.map(point=>point.x),y:points.map(point=>point.y),mode:'markers',type:'scatter',marker:{color:'#2563eb',opacity:.68,size:8},hovertemplate:`${esc(x)} %{x}<br>${esc(y)} %{y}<extra></extra>`}],layout);return;
  }
  const dateName=xKind==='date'?x:yKind==='date'?y:null,numberName=xKind==='number'?x:yKind==='number'?y:null;
  if(dateName&&numberName){
    const points=rows.map(row=>({date:parseDashboardDate(row[dateName]),value:Number(row[numberName])})).filter(point=>point.date!==null&&Number.isFinite(point.value)).sort((a,b)=>a.date-b.date);layout.xaxis.title=dateName;layout.yaxis.title=numberName;renderPlot('relationshipChart',[{x:points.map(point=>formatDateLabel(point.date)),y:points.map(point=>point.value),mode:'lines+markers',type:'scatter',line:{color:'#2563eb',width:2},marker:{color:'#2563eb',size:6},hovertemplate:'%{x}<br>%{y}<extra></extra>'}],layout);return;
  }
  const categoryName=['category','text','boolean'].includes(xKind)?x:['category','text','boolean'].includes(yKind)?y:null;
  if(categoryName&&numberName){
    const groups=new Map();rows.forEach(row=>{const category=row[categoryName],value=Number(row[numberName]);if(category===null||category===undefined||category===''||!Number.isFinite(value))return;const key=String(category),group=groups.get(key)||{sum:0,count:0};group.sum+=value;group.count++;groups.set(key,group)});const items=[...groups.entries()].map(([name,group])=>({name,mean:group.sum/group.count,count:group.count})).sort((a,b)=>b.count-a.count).slice(0,15);layout.xaxis.title=categoryName;layout.yaxis.title=`${numberName} 平均值`;layout.margin.b=90;renderPlot('relationshipChart',[{x:items.map(item=>item.name),y:items.map(item=>item.mean),type:'bar',marker:{color:'#2563eb'},customdata:items.map(item=>item.count),hovertemplate:'%{x}<br>平均值 %{y:.4f}<br>记录 %{customdata}<extra></extra>'}],layout);return;
  }
  showRelationEmpty('当前字段组合暂不支持','请选择 NUMBER × NUMBER、DATE × NUMBER 或 CATEGORY × NUMBER');
}
function refreshFilterFields(){const items=currentFields().map(field=>({value:field.column,label:field.column}));fillOptions($('filterField'),[{value:'',label:'全部字段'},...items]);updateFilterConditions()}
function updateFilterConditions(){
  const field=$('filterField').value,kind=field?kindOf(field):null;let items=[{value:'',label:'不限'}];
  if(kind==='number')items=items.concat([{value:'between',label:'范围内'},{value:'number_equal',label:'等于'},{value:'greater',label:'大于'},{value:'less',label:'小于'},{value:'empty',label:'为空'},{value:'not_empty',label:'非空'}]);
  else if(field)items=items.concat([{value:'contains',label:'包含'},{value:'equals',label:'等于'},{value:'empty',label:'为空'},{value:'not_empty',label:'非空'}]);
  fillOptions($('filterCondition'),items);updateFilterValueState();
}
function updateFilterValueState(){
  const condition=$('filterCondition').value,numberCondition=['between','number_equal','greater','less'].includes(condition),noValue=['','empty','not_empty'].includes(condition);
  $('filterValue').type=numberCondition?'number':'text';$('filterValue').step=numberCondition?'any':'';$('filterValue').disabled=noValue;$('filterValue').placeholder=condition==='between'?'最小值':'输入筛选值';$('filterMaxWrap').hidden=condition!=='between';if(condition!=='between')$('filterValueMax').value='';
}
function applyFilters(){
  const query=$('searchInput').value.trim().toLocaleLowerCase(),field=$('filterField').value,condition=$('filterCondition').value,value=$('filterValue').value,valueMax=$('filterValueMax').value;
  state.filtered=current().rows.filter(row=>{if(query&&!Object.values(row).some(item=>String(item??'').toLocaleLowerCase().includes(query)))return false;if(!field||!condition)return true;const raw=row[field],empty=raw===null||raw===undefined||raw==='';if(condition==='empty')return empty;if(condition==='not_empty')return!empty;if(empty)return false;if(condition==='contains')return String(raw).toLocaleLowerCase().includes(value.toLocaleLowerCase());if(condition==='equals')return String(raw)===value;const number=Number(raw),target=Number(value),maximum=Number(valueMax);if(!Number.isFinite(number))return false;if(condition==='between')return(value===''||number>=target)&&(valueMax===''||number<=maximum);if(!Number.isFinite(target))return true;if(condition==='number_equal')return number===target;if(condition==='greater')return number>target;if(condition==='less')return number<target;return true});state.page=1;renderTable();
}
function clearFilters(){$('searchInput').value='';$('filterField').value='';$('filterValue').value='';$('filterValueMax').value='';updateFilterConditions();state.filtered=current().rows.slice();state.page=1;renderTable()}
function changePage(delta){const pages=Math.max(1,Math.ceil(state.filtered.length/state.pageSize));state.page=Math.min(pages,Math.max(1,state.page+delta));renderTable()}
function renderTable(){
  const cols=current().columns,start=(state.page-1)*state.pageSize,rows=state.filtered.slice(start,start+state.pageSize),table=$('dataTable');
  const body=rows.length?rows.map(row=>`<tr>${cols.map(column=>{const kind=kindOf(column),klass=kind==='number'?'cell-number':kind==='date'?'cell-date':'';return`<td class="${klass}" title="${esc(row[column])}">${esc(row[column])}</td>`}).join('')}</tr>`).join(''):`<tr class="no-records"><td colspan="${cols.length}">没有符合条件的记录</td></tr>`;
  table.innerHTML=`<thead><tr>${cols.map(column=>`<th class="${kindOf(column)==='number'?'cell-number':''}">${esc(column)}</th>`).join('')}</tr></thead><tbody>${body}</tbody>`;
  const pages=Math.max(1,Math.ceil(state.filtered.length/state.pageSize));state.page=Math.min(state.page,pages);$('pageInfo').textContent=`第 ${state.page} / ${pages} 页`;$('recordCount').textContent=`${fmt(state.filtered.length)} 条记录`;$('prevPage').disabled=state.page<=1;$('nextPage').disabled=state.page>=pages;
}
init();
</script>
</body></html>"""


def _records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return json.loads(frame.to_json(orient="records", date_format="iso", force_ascii=False))


def _offline_plotly_js() -> str:
    """Embed Plotly with external URLs disabled and namespace URIs preserved."""

    def disable_external_url(match: re.Match[str]) -> str:
        url = match.group(0)
        if url.casefold().startswith(W3C_NAMESPACE_PREFIXES):
            # Preserve the namespace value at JavaScript runtime without leaving
            # an http/https resource-looking literal in the offline HTML source.
            return url.replace("://", r":\x2f\x2f", 1)
        return "about:blank"

    bundle = PLOTLY_URL_PATTERN.sub(disable_external_url, get_plotlyjs())
    if re.search(r"https?://", bundle, re.IGNORECASE) or "cdn" + ".plot.ly" in bundle.casefold():
        raise RuntimeError("Plotly bundle still contains an external URL reference")
    return bundle


def _comparison(before: pd.DataFrame, after: pd.DataFrame) -> dict[str, int]:
    return {
        "before_rows": int(len(before)), "after_rows": int(len(after)),
        "before_columns": int(len(before.columns)), "after_columns": int(len(after.columns)),
        "before_missing_cells": int(before.isna().sum().sum()),
        "after_missing_cells": int(after.isna().sum().sum()),
        "before_duplicate_rows": int(before.duplicated(keep=False).sum()) if len(before) else 0,
        "after_duplicate_rows": int(after.duplicated(keep=False).sum()) if len(after) else 0,
    }


def generate_dashboard(
    before: dict[str, pd.DataFrame],
    after: dict[str, pd.DataFrame],
    logs: list[dict[str, Any]],
    output_path: Path,
    preview_limit: int = PREVIEW_LIMIT,
    mode: str = "safe",
) -> Path:
    """Write an offline dashboard with embedded Plotly and embedded preview data."""
    datasets: dict[str, Any] = {}
    for name, frame in after.items():
        preview = frame.head(preview_limit)
        datasets[name] = {
            "total_rows": int(len(frame)), "preview_rows": int(len(preview)),
            "columns": [str(column) for column in frame.columns], "rows": _records(preview),
            "profile": profile_dataset(name, frame), "comparison": _comparison(before[name], frame),
            "changes": [entry for entry in logs if entry.get("dataset") == name],
        }
    generated_at = datetime.now().astimezone()
    payload = {
        "preview_limit": preview_limit,
        "mode": mode,
        "generated_at": generated_at.isoformat(timespec="seconds"),
        "generated_at_display": generated_at.strftime("%Y-%m-%d %H:%M"),
        "datasets": datasets,
    }
    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = Template(HTML_TEMPLATE).render(plotly_js=_offline_plotly_js(), payload_json=payload_json)
    output_path.write_text(html, encoding="utf-8", newline="\n")
    LOGGER.info("Generated offline dashboard: %s", output_path)
    return output_path
