import { useEffect, useRef, useState } from 'react'
import { cleanDataset, datasetToCsv, downloadText, getSampleDataset, readDataset } from './dataCleaning.js'

const EMAIL = 'yanami_trade@163.com'
const PHONE = '17734946856'
const withBase = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
const GAME_URL = withBase('moonlight-guardian.html')
const FIREFLY_GAME_URL = withBase('game/firefly-train/')
const FIREFLY_PROJECT_URL = withBase('projects/firefly-train.html')
const FIREFLY_COVER_URL = withBase('firefly-train-cover.png')

const projectCategories = [
  {
    id: 'data',
    number: '01',
    eyebrow: 'DATA ANALYSIS',
    title: '数据分析项目集合',
    description: '以 data-cleaning-dashboard 为核心，展示从数据质量检查、安全清洗到报告和交互看板的完整工作流。',
    meta: '1 个完整项目',
    tags: ['Python', 'Pandas', 'Plotly', 'Excel'],
    tone: '#e8dfd4',
  },
  {
    id: 'poster',
    number: '02',
    eyebrow: 'POSTER DESIGN',
    title: '自制海报作品',
    description: '收录 5 张平面设计复刻作品，涵盖商业促销、活动招新与报刊排版，进入详情后自动轮播展示。',
    meta: '5 张复刻作品',
    tags: ['Photoshop', 'Illustrator', '视觉设计'],
    tone: '#dce4e0',
  },
  {
    id: 'ai',
    number: '03',
    eyebrow: 'AI CREATION',
    title: 'AI 创作实验室',
    description: '集中展示 AI 图像、动态影像与提示词实验，可按图片和视频筛选。',
    meta: '图像 + 视频',
    tags: ['AI 绘图', '视频生成', 'Prompt'],
    tone: '#e2dbd8',
  },
  {
    id: 'editing',
    number: '04',
    eyebrow: 'VIDEO EDITING',
    title: '剪辑作品集',
    description: '展示短片、节奏剪辑与叙事包装项目，进入详情可切换不同作品。',
    meta: '视频剪辑案例',
    tags: ['Premiere Pro', '节奏设计', '后期包装'],
    tone: '#dde0e6',
  },
]

const posterSlides = [
  { id: 'p1', index: '01', title: '柠檬果汁海报', subtitle: 'LEMON JUICE', imageKey: 'lemon' },
  { id: 'p2', index: '02', title: '社团招新 3D 海报', subtitle: 'CLUB RECRUITMENT', imageKey: 'clubRecruitment' },
  { id: 'p3', index: '03', title: '下午茶活动海报', subtitle: 'AFTERNOON TEA', imageKey: 'afternoonTea' },
  { id: 'p4', index: '04', title: '贵阳报刊排版海报', subtitle: 'TRAVEL NEWSPAPER', imageKey: 'newspaper' },
  { id: 'p5', index: '05', title: '奶茶促销海报', subtitle: 'MILK TEA CAMPAIGN', imageKey: 'milkTea' },
]

const aiWorks = [
  { id: 'a1', kind: 'image', title: '云端花园', label: 'AI IMAGE', style: 'ai-work--garden' },
  { id: 'a2', kind: 'video', title: '流体梦境', label: 'AI VIDEO', style: 'ai-work--fluid' },
  { id: 'a3', kind: 'image', title: '未来橱窗', label: 'AI IMAGE', style: 'ai-work--future' },
  { id: 'a4', kind: 'video', title: '光影呼吸', label: 'AI VIDEO', style: 'ai-work--light' },
]

const editingWorks = [
  { id: 'e1', title: '城市节奏短片', type: '节奏剪辑', duration: '00:48', color: '#d8b18c' },
  { id: 'e2', title: '品牌叙事混剪', type: '商业包装', duration: '01:26', color: '#9cafaa' },
  { id: 'e3', title: '校园记忆影像', type: '纪实短片', duration: '02:14', color: '#96a6ba' },
]

const skills = [
  ['DA', '数据分析', ['Python (Pandas, NumPy)', 'SQL', '数据可视化', 'ETL 流程', 'Excel 高级分析']],
  ['ML', 'AI & 机器学习', ['Scikit-learn', '决策树 / KNN', 'TF-IDF 特征工程', 'AI 生图与视频', '提示词工程']],
  ['UX', '工具与平台', ['Fine BI', 'Jupyter', 'Photoshop / Illustrator', 'Premiere Pro', 'Linux 基础']],
  ['CO', '软实力', ['数据敏感度', '严谨细致', '跨部门沟通', '新媒体运营', '团队协作']],
]

const stats = [['4+', '数据分析项目'], ['2', '实习经历'], ['5', '获奖荣誉'], ['3', '核心工具栈']]

const cleaningDemoSlides = [
  {
    id: 'profile',
    step: '01 / PROFILE',
    title: '先识别问题，不急着修改',
    description: '快速定位缺失值、重复记录、空字段与类型异常，先建立清晰的数据质量基线。',
  },
  {
    id: 'clean',
    step: '02 / SAFE CLEAN',
    title: '只执行确定、安全的规则',
    description: '清理空行、空列、完全重复记录与文本空格；业务语义不明确的数据保持原样。',
  },
  {
    id: 'deliver',
    step: '03 / DELIVER',
    title: '输出结果，也输出证据',
    description: '交付清洗数据、质量报告、交互看板与完整日志，让每一次修改都能够回溯。',
  },
]

const shapes = [
  ['dot', '8%', '20%', '0s', '8s', '98px', '18px'],
  ['cross reverse', '16%', '76%', '-4s', '10s', '82px', '-28px'],
  ['diamond', '28%', '12%', '-8s', '11s', '116px', '26px'],
  ['dot small soft', '36%', '86%', '-3s', '7.5s', '88px', '-20px'],
  ['ring small', '47%', '19%', '-10s', '9.5s', '108px', '24px'],
  ['petal', '57%', '81%', '-6s', '8.5s', '124px', '-15px'],
  ['cross small reverse', '66%', '15%', '-12s', '11s', '92px', '30px'],
  ['line soft', '71%', '61%', '-5s', '8s', '112px', '-24px'],
  ['diamond small', '76%', '82%', '-1s', '9s', '102px', '20px'],
  ['dot', '88%', '31%', '-9s', '11.5s', '132px', '-24px'],
  ['ring', '84%', '67%', '-7s', '10s', '110px', '28px'],
  ['cross', '92%', '70%', '-14s', '12s', '142px', '-20px'],
  ['petal small reverse', '21%', '48%', '-11s', '9.5s', '106px', '25px'],
  ['line', '4%', '58%', '-2s', '8.5s', '118px', '-16px'],
  ['ring small reverse', '11%', '38%', '-5.5s', '10.5s', '96px', '22px'],
  ['diamond small soft', '24%', '66%', '-7.5s', '9s', '112px', '-18px'],
  ['dot small', '42%', '10%', '-3.5s', '8s', '104px', '20px'],
  ['cross soft', '52%', '70%', '-9.5s', '11s', '128px', '-26px'],
  ['petal reverse', '62%', '36%', '-1.5s', '9s', '116px', '24px'],
  ['dot small soft', '73%', '25%', '-6.5s', '7.5s', '92px', '-20px'],
  ['line reverse', '82%', '48%', '-10.5s', '10s', '136px', '18px'],
  ['diamond soft', '95%', '18%', '-4.5s', '11.5s', '120px', '-24px'],
]

function useRevealOnScroll() {
  useEffect(() => {
    const items = [...document.querySelectorAll('[data-reveal]')]
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'))
      return undefined
    }

    document.documentElement.classList.add('reveal-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

    items.forEach((item) => observer.observe(item))
    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('reveal-ready')
    }
  }, [])
}

function SectionHeader({ number, title, description }) {
  return (
    <div className="section-header" data-reveal>
      <span className="section-header__number">{number}</span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </div>
  )
}

function Navigation({ menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}${menuOpen ? ' nav--menu-open' : ''}`} aria-label="主导航">
      <div className="nav__inner">
        <a className="nav__logo" href="#hero" onClick={closeMenu} aria-label="返回首页">Ding<span>.</span></a>
        <button className="nav__toggle" type="button" aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span /><span />
        </button>
        <div className={`nav__links${menuOpen ? ' nav__links--open' : ''}`} id="primary-navigation">
          <a href="#experience" onClick={closeMenu}>经历</a>
          <a href="#projects" onClick={closeMenu}>项目</a>
          <a href="#game" onClick={closeMenu}>游戏</a>
          <a href="#skills" onClick={closeMenu}>能力</a>
          <a href="#contact" className="nav__cta" onClick={closeMenu}>联系我</a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__glow hero__glow--one" /><div className="hero__glow hero__glow--two" />
      <div className="hero__shapes" aria-hidden="true">
        {shapes.map(([kind, left, top, delay, duration, windX, windY]) => (
          <span
            key={`${left}-${top}`}
            className={`shape ${kind}`}
            style={{ left, top, animationDelay: delay, animationDuration: duration, '--wind-x': windX, '--wind-y': windY }}
          />
        ))}
      </div>
      <div className="hero__content">
        <p className="hero__eyebrow">数据分析师 / AI 设计师</p>
        <h1><span>用数据洞察世界，</span><span>以创意塑造未来。</span></h1>
        <p className="hero__description">擅长从复杂数据中提炼故事，结合 AI 与设计思维，<br />为每一个项目注入温度与深度。</p>
        <div className="hero__actions">
          <a className="button button--dark" href="#projects">查看作品</a>
          <a className="button button--light" href="#contact">联系我</a>
        </div>
      </div>
      <a className="hero__scroll" href="#experience" aria-label="向下浏览个人经历"><span>Scroll</span><i /></a>
    </section>
  )
}

function Experience() {
  return (
    <section className="experience section" id="experience">
      <div className="container">
        <SectionHeader number="01" title="关于我" description="在数据、技术与创意之间建立连接" />
        <div className="experience__grid" data-reveal>
          <div className="profile-card">
            <div className="profile-card__avatar" aria-hidden="true">DYX</div>
            <h3>丁垚鑫</h3>
            <p className="profile-card__role">数据分析师 / AI 设计师</p>
            <p className="profile-card__education">重庆移通学院 · 大数据管理 · 2026 届</p>
            <div className="profile-card__contact"><a href={`mailto:${EMAIL}`}>{EMAIL}</a><span>中国 · 重庆</span></div>
          </div>
          <div className="experience__content">
            <p className="experience__intro">热爱数据与设计的大数据管理专业毕业生。熟练运用 Python、SQL 进行数据清洗、分析与可视化，具备实际运维实习经验，擅长从复杂数据中提炼清晰结论。同时对 AI 绘图与视频生成保持热忱，致力于用数据洞察驱动创意表达。</p>
            <div className="stats" aria-label="个人经历数据">
              {stats.map(([number, label]) => <div className="stat" key={label}><strong>{number}</strong><span>{label}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProjectVisual({ category }) {
  if (category.id === 'poster') {
    return (
      <div className="project-card__visual project-visual project-visual--poster" aria-hidden="true" style={{ '--tone': category.tone }}>
        <span className="project-visual__number">{category.number}</span>
        <div className="poster-stack">
          <span className="poster-mini poster-mini--back">TYPE</span>
          <span className="poster-mini poster-mini--middle">IDEA</span>
          <span className="poster-mini poster-mini--front">POSTER</span>
        </div>
      </div>
    )
  }

  if (category.id === 'ai') {
    return (
      <div className="project-card__visual project-visual project-visual--ai" aria-hidden="true" style={{ '--tone': category.tone }}>
        <span className="project-visual__number">{category.number}</span>
        <div className="ai-preview-grid"><i /><i /><i /><i /></div>
        <span className="media-play">▶</span>
      </div>
    )
  }

  if (category.id === 'editing') {
    return (
      <div className="project-card__visual project-visual project-visual--editing" aria-hidden="true" style={{ '--tone': category.tone }}>
        <span className="project-visual__number">{category.number}</span>
        <div className="editing-preview-screen"><span>▶</span></div>
        <div className="editing-preview-timeline"><i /><i /><i /><i /></div>
      </div>
    )
  }

  return (
    <div className="project-card__visual project-visual project-visual--data" aria-hidden="true" style={{ '--tone': category.tone }}>
      <span className="project-visual__number">{category.number}</span>
      <svg viewBox="0 0 180 72" fill="none"><path d="M2 62c23-4 32-25 54-24 19 1 27 17 44 12 18-5 27-34 45-35 11 0 20 8 33 3" /><circle cx="56" cy="38" r="4" /><circle cx="100" cy="50" r="4" /><circle cx="145" cy="15" r="4" /></svg>
      <strong>1 CASE</strong>
    </div>
  )
}

function Projects({ onOpen }) {
  return (
    <section className="projects section" id="projects">
      <div className="container">
        <SectionHeader number="02" title="精选项目" description="从数据洞察到视觉创作，点击进入对应作品集" />
        <div className="projects__grid">
          {projectCategories.map((project, index) => (
            <button className={`project-card project-card--${project.id}`} type="button" key={project.id} data-reveal style={{ '--delay': `${index * 80}ms` }} onClick={(event) => onOpen(project.id, event.currentTarget)} aria-label={`查看${project.title}详情`}>
              <ProjectVisual category={project} />
              <div className="project-card__body">
                <div className="project-card__meta"><span>{project.eyebrow}</span><small>{project.meta}</small></div>
                <h3>{project.title}</h3><p>{project.description}</p>
                <ul className="tag-list" aria-label={`${project.title}使用的技术`}>{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                <span className="project-card__open">查看详情 <b aria-hidden="true">↗</b></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function DataCleaningProjectDetail() {
  const fileInputRef = useRef(null)
  const [result, setResult] = useState(() => cleanDataset(getSampleDataset()))
  const [status, setStatus] = useState('sample')
  const [message, setMessage] = useState('当前展示示例数据的安全清洗结果，你也可以选择自己的文件。')
  const [demoIndex, setDemoIndex] = useState(0)
  const [demoPaused, setDemoPaused] = useState(false)

  useEffect(() => {
    if (demoPaused) return undefined
    const timer = window.setInterval(() => {
      setDemoIndex((index) => (index + 1) % cleaningDemoSlides.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [demoPaused])

  const processDataset = (dataset) => {
    const next = cleanDataset(dataset)
    setResult(next)
    setStatus('success')
    setMessage(`已在浏览器本地完成 ${dataset.name} 的 safe 模式清洗，原始文件未被修改。`)
  }

  const processFile = async (file) => {
    if (!file) return
    setStatus('loading')
    setMessage(`正在读取 ${file.name}…`)
    try {
      processDataset(await readDataset(file))
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '文件处理失败，请检查格式后重试。')
    }
  }

  const onFileChange = async (event) => {
    await processFile(event.target.files?.[0])
    event.target.value = ''
  }

  const onDrop = async (event) => {
    event.preventDefault()
    await processFile(event.dataTransfer.files?.[0])
  }

  const loadSample = () => {
    setResult(cleanDataset(getSampleDataset()))
    setStatus('sample')
    setMessage('已重新载入示例数据：包含重复行、空行、空列、空值标记与文本空格。')
  }

  const downloadCleaned = () => {
    const basename = result.name.replace(/\.[^.]+$/, '') || 'dataset'
    downloadText(`${basename}_cleaned.csv`, datasetToCsv(result), 'text/csv;charset=utf-8')
  }

  const downloadLog = () => {
    const basename = result.name.replace(/\.[^.]+$/, '') || 'dataset'
    downloadText(`${basename}_cleaning_log.json`, JSON.stringify(result.logs, null, 2), 'application/json;charset=utf-8')
  }

  const metricCards = [
    ['原始记录', result.metrics.beforeRows, `${result.metrics.beforeColumns} 个字段`],
    ['清洗后记录', result.metrics.afterRows, `${result.metrics.afterColumns} 个字段`],
    ['删除重复', result.metrics.duplicatesRemoved, '仅完全重复记录'],
    ['操作日志', result.logs.length, '全部修改可追溯'],
  ]
  const activeDemo = cleaningDemoSlides[demoIndex]

  return (
    <div className="data-tool data-tool--embedded">
        <div className="data-tool__intro" data-reveal>
          <div>
            <p className="data-tool__eyebrow">DATA CLEANING DASHBOARD · SAFE MODE</p>
            <h3>数据清洗与质量看板</h3>
          </div>
          <p>一个可复用的项目级 Codex Skill：从数据质量检查、安全清洗到 Excel 报告和离线交互看板，构建完整、可追溯的数据处理工作流。</p>
        </div>

        <div className="data-tool__case-grid" data-reveal>
          <article>
            <span>01 / CHALLENGE</span>
            <h4>数据问题多，但不能贸然修改</h4>
            <p>真实表格同时包含空值、重复、格式混乱和业务异常，自动化必须在效率与数据安全之间保持边界。</p>
          </article>
          <article>
            <span>02 / METHOD</span>
            <h4>以 safe 模式建立清洗策略</h4>
            <p>只自动处理可以明确判断的问题；异常值、缺失值填补和类别合并仅提示，由使用者确认。</p>
          </article>
          <article>
            <span>03 / VALUE</span>
            <h4>把脚本结果变成可解释交付物</h4>
            <p>清洗结果、质量报告、交互看板和日志同步生成，让非技术使用者也能理解数据发生了什么变化。</p>
          </article>
        </div>

        <div className="data-tool-demo" data-reveal>
          <div className="data-tool-demo__copy">
            <p className="data-tool__eyebrow">AUTO PROJECT WALKTHROUGH</p>
            <h3>用一段自动演示，快速看懂完整工作流。</h3>
            <p>{activeDemo.description}</p>
            <div className="data-tool-demo__controls" aria-label="选择数据清洗流程演示">
              {cleaningDemoSlides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.id}
                  className={demoIndex === index ? 'is-active' : ''}
                  aria-label={`查看${slide.title}`}
                  aria-pressed={demoIndex === index}
                  onClick={() => setDemoIndex(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>{slide.title}
                </button>
              ))}
            </div>
          </div>

          <div
            className="data-tool-demo__screen"
            onMouseEnter={() => setDemoPaused(true)}
            onMouseLeave={() => setDemoPaused(false)}
          >
            <div className="data-tool-demo__bar">
              <span /><span /><span />
              <small>DATA CLEANING DASHBOARD</small>
              <b>{demoPaused ? '已暂停' : '自动播放'}</b>
            </div>
            <div className={`data-tool-demo__slide data-tool-demo__slide--${activeDemo.id}`} key={activeDemo.id}>
              <header><span>{activeDemo.step}</span><h4>{activeDemo.title}</h4></header>
              {activeDemo.id === 'profile' && (
                <>
                  <div className="demo-kpis">
                    <div><span>总记录</span><strong>12,480</strong></div>
                    <div><span>缺失单元格</span><strong>368</strong></div>
                    <div><span>重复记录</span><strong>126</strong></div>
                  </div>
                  <div className="demo-chart" aria-hidden="true">
                    <span style={{ '--bar': '72%' }}><i>客户备注</i><b>28.4%</b></span>
                    <span style={{ '--bar': '46%' }}><i>联系电话</i><b>17.9%</b></span>
                    <span style={{ '--bar': '24%' }}><i>订单日期</i><b>8.2%</b></span>
                    <span style={{ '--bar': '12%' }}><i>销售区域</i><b>3.1%</b></span>
                  </div>
                </>
              )}
              {activeDemo.id === 'clean' && (
                <div className="demo-cleaning">
                  <div>
                    <small>BEFORE</small>
                    <span><b>订单编号&nbsp;</b><i>A-001&nbsp;</i><em>N/A</em></span>
                    <span><b>销售额</b><i>1,280</i><em>重复</em></span>
                    <span className="is-empty"><b>空字段</b><i>—</i><em>全空</em></span>
                  </div>
                  <strong aria-hidden="true">→</strong>
                  <div>
                    <small>AFTER</small>
                    <span><b>订单编号</b><i>A-001</i><em>保留</em></span>
                    <span><b>销售额</b><i>1280</i><em>数值</em></span>
                    <span className="is-removed"><b>重复与空列</b><i>已处理</i><em>安全</em></span>
                  </div>
                </div>
              )}
              {activeDemo.id === 'deliver' && (
                <div className="demo-deliverables">
                  <div><span>XLSX</span><strong>清洗后数据</strong><small>保留多工作表</small></div>
                  <div><span>REPORT</span><strong>质量分析报告</strong><small>八个分析模块</small></div>
                  <div><span>HTML</span><strong>交互式看板</strong><small>完全离线打开</small></div>
                  <div><span>JSON</span><strong>清洗操作日志</strong><small>每项修改可追溯</small></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="data-tool__experience-heading" data-reveal>
          <span>TRY IT YOURSELF</span>
          <div><h3>轻量互动体验</h3><p>无需准备文件，可直接使用示例数据；也可导入自己的小型数据进行浏览器本地清洗。</p></div>
        </div>

        <div className="data-tool__workspace" data-reveal>
          <aside className="data-tool__panel">
            <div
              className={`data-tool__dropzone${status === 'loading' ? ' is-loading' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.json,.xlsx,.xls" onChange={onFileChange} />
              <span className="data-tool__filemark" aria-hidden="true">DATA</span>
              <h4>拖入数据文件</h4>
              <p>CSV · TSV · JSON</p>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={status === 'loading'}>
                {status === 'loading' ? '正在处理…' : '选择数据文件'}
              </button>
              <small>文件只在你的浏览器中处理</small>
            </div>

            <div className="data-tool__full-skill">
              <span>完整 Python Skill</span>
              <h4>支持 XLSX 多工作表与完整报告</h4>
              <ul>
                <li>清洗后的 Excel / CSV</li>
                <li>八部分数据质量报告</li>
                <li>离线交互式数据看板</li>
                <li>JSON 全量清洗日志</li>
              </ul>
              <p>完整能力保留在项目级 <code>data-cleaning-dashboard</code> Skill 中，默认采用 safe 模式，不覆盖原始文件。</p>
            </div>
          </aside>

          <div className="data-tool__result">
            <header className="data-tool__result-header">
              <div>
                <span>{result.format} / {result.name}</span>
                <h4>安全清洗概览</h4>
              </div>
              <div className="data-tool__actions">
                <button type="button" className="data-tool__secondary" onClick={loadSample}>载入示例</button>
                <button type="button" onClick={downloadCleaned}>下载 CSV</button>
                <button type="button" onClick={downloadLog}>下载日志</button>
              </div>
            </header>

            <p className={`data-tool__message data-tool__message--${status}`} role="status">{message}</p>

            <div className="data-tool__metrics">
              {metricCards.map(([label, value, note]) => (
                <div key={label}><span>{label}</span><strong>{String(value).padStart(2, '0')}</strong><small>{note}</small></div>
              ))}
            </div>

            <div className="data-tool__table-wrap">
              <table>
                <caption>清洗结果预览，最多显示前 6 行</caption>
                <thead><tr>{result.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
                <tbody>
                  {result.rows.slice(0, 6).map((row, rowIndex) => (
                    <tr key={`${rowIndex}-${row.join('|')}`}>
                      {row.map((value, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{value === null ? <em>空值</em> : String(value)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="data-tool__log">
              <div><span>TRACEABLE LOG</span><strong>{result.logs.length} 项自动操作</strong></div>
              <ol>
                {result.logs.slice(0, 4).map((entry, index) => (
                  <li key={`${entry.action}-${entry.column ?? index}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p><strong>{entry.action}</strong><small>{entry.reason} · 影响 {entry.affected_rows} 项</small></p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <p className="data-tool__note" data-reveal>
          网页版用于作品展示与快速体验；金额单位、业务缺失值、异常值和相似类别等不确定问题只提示、不擅自修改。
        </p>

        <div className="data-tool__capability" data-reveal>
          <header>
            <div><span>FULL CAPABILITY</span><h3>网页体验与完整 Skill，各自承担合适的任务。</h3></div>
            <p>作品集优先让访客快速理解项目；完整数据处理保留在经过测试的 Python 工作流中，避免开放式上传带来的服务器与隐私风险。</p>
          </header>
          <div className="data-tool__compare" role="table" aria-label="网页版与完整数据清洗 Skill 功能对比">
            <div className="data-tool__compare-head" role="row">
              <span role="columnheader">能力</span><strong role="columnheader">网页轻量体验</strong><strong role="columnheader">完整 Python Skill</strong>
            </div>
            {[
              ['适合场景', '访客快速体验与作品展示', '真实项目数据清洗与正式交付'],
              ['支持文件', 'CSV、TSV、JSON', 'CSV、TSV、XLSX、JSON'],
              ['处理位置', '访客浏览器本地，不上传', '受控的本地或服务端 Python 环境'],
              ['输出结果', '清洗 CSV、JSON 日志', 'Excel / CSV、质量报告、离线看板、完整日志'],
              ['安全策略', '仅执行确定规则', 'safe 模式 + 多工作表保留 + 全流程测试'],
            ].map(([label, light, full]) => (
              <div role="row" key={label}><span role="cell">{label}</span><p role="cell">{light}</p><p role="cell">{full}</p></div>
            ))}
          </div>
          <footer>
            <span>PROJECT PROOF</span>
            <ul><li>4 类输入格式</li><li>5 类输出文件</li><li>8 个报告模块</li><li>全量操作日志</li><li>离线交互看板</li></ul>
          </footer>
        </div>
    </div>
  )
}

function GameShowcase() {
  const [activeGame, setActiveGame] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)
  const touchStartX = useRef(null)
  const gameCount = 2

  const changeGame = (step) => {
    setSlideDirection(step >= 0 ? 1 : -1)
    setActiveGame((current) => (current + step + gameCount) % gameCount)
  }

  const selectGame = (index) => {
    if (index === activeGame) return
    setSlideDirection(index > activeGame ? 1 : -1)
    setActiveGame(index)
  }

  return (
    <section className="game-showcase section" id="game">
      <div className="container">
        <SectionHeader number="03" title="浏览器游戏" description="从独立游戏开发到网页交互实验，直接在浏览器中体验完整作品" />
        <div
          className="game-showcase__carousel"
          data-reveal
          role="region"
          aria-roledescription="轮播"
          aria-label="游戏作品切换"
          tabIndex="0"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              changeGame(-1)
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              changeGame(1)
            }
          }}
          onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return
            const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
            const distance = touchStartX.current - endX
            touchStartX.current = null
            if (Math.abs(distance) < 45) return
            changeGame(distance > 0 ? 1 : -1)
          }}
        >
          <div className="game-showcase__carousel-nav">
            <span className="game-showcase__counter" aria-live="polite">
              {String(activeGame + 1).padStart(2, '0')} / {String(gameCount).padStart(2, '0')}
            </span>
            <div className="game-showcase__arrows">
              <button type="button" onClick={() => changeGame(-1)} aria-label="查看上一个游戏">←</button>
              <button type="button" onClick={() => changeGame(1)} aria-label="查看下一个游戏">→</button>
            </div>
          </div>

          <div className="game-showcase__stage">
            <div key={activeGame} className={`game-showcase__slide game-showcase__slide--${slideDirection > 0 ? 'next' : 'previous'}`}>
              {activeGame === 0 ? (
                <article className="game-showcase__layout game-showcase__entry game-showcase__entry--featured">
                  <div className="game-showcase__copy">
                    <p className="game-showcase__eyebrow">GAME DEVELOPMENT · COCOS CREATOR</p>
                    <h3>萤火列车：雾境远征</h3>
                    <p>使用 Cocos Creator 3.8.8 与 TypeScript 独立开发的原创竖屏 Roguelike 射击游戏。操控林茉或罗恩守护萤火号，在四章节战斗中组合能力、装备与角色技能。</p>
                    <dl className="game-showcase__facts">
                      <div><dt>04</dt><dd>完整章节</dd></div>
                      <div><dt>02</dt><dd>出战角色</dd></div>
                      <div><dt>09</dt><dd>局内能力</dd></div>
                    </dl>
                    <ul className="game-showcase__tags" aria-label="萤火列车使用的技术">
                      <li>Game Development</li><li>Cocos Creator</li><li>TypeScript</li><li>Web</li>
                    </ul>
                    <div className="game-showcase__actions">
                      <a className="button game-showcase__button" href={FIREFLY_GAME_URL}>
                        在线试玩 <span aria-hidden="true">↗</span>
                      </a>
                      <a className="button game-showcase__button game-showcase__button--secondary" href={FIREFLY_PROJECT_URL}>
                        项目详情
                      </a>
                    </div>
                  </div>

                  <div className="game-window game-window--firefly">
                    <div className="game-window__bar" aria-hidden="true">
                      <span /><span /><span /><small>COCOS CREATOR / WEB MOBILE</small>
                    </div>
                    <div className="game-window__viewport game-window__viewport--cover">
                      <img src={FIREFLY_COVER_URL} alt="《萤火列车：雾境远征》微光森林战斗场景" />
                      <div className="game-window__cover-copy" aria-hidden="true">
                        <small>FIREFLY TRAIN</small>
                        <strong>驶向雾境深处</strong>
                      </div>
                      <a href={FIREFLY_GAME_URL} target="_blank" rel="noreferrer" aria-label="在新页面打开萤火列车：雾境远征">
                        <span>进入远征</span><b aria-hidden="true">↗</b>
                      </a>
                    </div>
                  </div>
                </article>
              ) : (
                <article className="game-showcase__layout game-showcase__entry">
                  <div className="game-showcase__copy">
                    <p className="game-showcase__eyebrow">ORIGINAL 2D STRATEGY GAME</p>
                    <h3>花园防线：月光守卫</h3>
                    <p>一款原创横向分路塔防游戏。玩家通过生产能量晶、组合不同守卫并把握波次节奏，抵御从多条路线推进的灰影军团。</p>
                    <dl className="game-showcase__facts">
                      <div><dt>05</dt><dd>分路战场</dd></div>
                      <div><dt>08</dt><dd>原创守卫</dd></div>
                      <div><dt>05</dt><dd>主题关卡</dd></div>
                    </dl>
                    <ul className="game-showcase__tags" aria-label="月光守卫使用的技术">
                      <li>HTML5 Canvas</li><li>JavaScript</li><li>原创美术</li><li>响应式交互</li>
                    </ul>
                    <a className="button game-showcase__button" href={GAME_URL} target="_blank" rel="noreferrer">
                      开始游戏 <span aria-hidden="true">↗</span>
                    </a>
                  </div>

                  <div className="game-window">
                    <div className="game-window__bar" aria-hidden="true">
                      <span /><span /><span /><small>HTML5 / CANVAS</small>
                    </div>
                    <div className="game-window__viewport">
                      <iframe title="花园防线：月光守卫游戏预览" src={GAME_URL} loading="lazy" scrolling="no" tabIndex="-1" />
                      <a href={GAME_URL} target="_blank" rel="noreferrer" aria-label="在新页面打开花园防线：月光守卫">
                        <span>打开完整游戏</span><b aria-hidden="true">↗</b>
                      </a>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </div>

          <div className="game-showcase__dots" aria-label="选择游戏">
            {['萤火列车：雾境远征', '花园防线：月光守卫'].map((name, index) => (
              <button
                className={activeGame === index ? 'is-active' : ''}
                type="button"
                key={name}
                onClick={() => selectGame(index)}
                aria-label={`查看${name}`}
                aria-current={activeGame === index ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DataProjectsDetail() {
  return <DataCleaningProjectDetail />
}

function PosterCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [posterImages, setPosterImages] = useState(null)

  useEffect(() => {
    let active = true
    import('./posterData.js').then(({ default: images }) => {
      if (active) setPosterImages(images)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % posterSlides.length), 2600)
    return () => window.clearInterval(timer)
  }, [paused])

  const previous = () => setCurrent((index) => (index - 1 + posterSlides.length) % posterSlides.length)
  const next = () => setCurrent((index) => (index + 1) % posterSlides.length)

  return (
    <div className="poster-carousel" data-testid="poster-carousel" data-paused={paused} onMouseEnter={() => setPaused(true)} onMouseOver={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onPointerEnter={() => setPaused(true)} onPointerMove={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="poster-carousel__stage">
        {posterSlides.map((poster, index) => (
          <article className={`poster-slide${current === index ? ' poster-slide--active' : ''}`} aria-hidden={current !== index} key={poster.id}>
            <span>{poster.index}</span>
            {posterImages
              ? <img src={posterImages[poster.imageKey]} alt={`${poster.title}复刻作品`} />
              : <div className="poster-slide__loading">作品载入中…</div>}
          </article>
        ))}
      </div>
      <div className="poster-carousel__caption" aria-live="polite">
        <div><small>{posterSlides[current].subtitle}</small><h3>{posterSlides[current].title}</h3></div>
        <span>视觉复刻练习 · 丁垚鑫</span>
      </div>
      <div className="poster-carousel__controls">
        <button type="button" onClick={previous} aria-label="上一张海报">←</button>
        <div>{posterSlides.map((poster, index) => <button type="button" key={poster.id} className={current === index ? 'is-current' : ''} onClick={() => setCurrent(index)} aria-label={`查看第 ${index + 1} 张海报`} />)}</div>
        <button type="button" onClick={next} aria-label="下一张海报">→</button>
      </div>
      <p className="carousel-status"><span />{paused ? '悬停暂停中' : '自动轮播中'} · {String(current + 1).padStart(2, '0')} / {String(posterSlides.length).padStart(2, '0')}</p>
    </div>
  )
}

function AiWorksDetail() {
  const [filter, setFilter] = useState('all')
  const visibleWorks = filter === 'all' ? aiWorks : aiWorks.filter((work) => work.kind === filter)
  return (
    <div className="ai-works-detail">
      <div className="media-filters" aria-label="筛选 AI 作品">
        {[['all', '全部'], ['image', '图片'], ['video', '视频']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <div className="ai-work-grid">
        {visibleWorks.map((work) => (
          <article className={`ai-work ${work.style}`} key={work.id}>
            <div aria-hidden="true">{work.kind === 'video' && <span className="ai-work__play">▶</span>}<i /><i /></div>
            <small>{work.label}</small><h3>{work.title}</h3>
          </article>
        ))}
      </div>
    </div>
  )
}

function EditingWorksDetail() {
  const [selected, setSelected] = useState(0)
  const work = editingWorks[selected]
  return (
    <div className="editing-detail">
      <div className="editing-player" style={{ '--edit-accent': work.color }}>
        <div className="editing-player__screen"><span>▶</span><strong>{work.title}</strong><time>{work.duration}</time></div>
        <div className="editing-player__tracks" aria-hidden="true"><i /><i /><i /><i /><i /><b /></div>
      </div>
      <div className="editing-list" aria-label="选择剪辑作品">
        {editingWorks.map((item, index) => (
          <button type="button" key={item.id} className={selected === index ? 'is-selected' : ''} onClick={() => setSelected(index)}>
            <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.type} · {item.duration}</small></div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProjectModal({ categoryId, onClose, triggerRef }) {
  const category = projectCategories.find((item) => item.id === categoryId)
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.body.classList.add('modal-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [onClose, triggerRef])

  return (
    <div className="project-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`project-modal project-modal--${category.id}`} role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <button autoFocus className="project-modal__close" type="button" onClick={onClose} aria-label="关闭项目详情">×</button>
        <header className="project-modal__header">
          <span>{category.number} / {category.eyebrow}</span><h2 id="project-modal-title">{category.title}</h2><p>{category.description}</p>
        </header>
        <div className="project-modal__body">
          {category.id === 'data' && <DataProjectsDetail />}
          {category.id === 'poster' && <PosterCarousel />}
          {category.id === 'ai' && <AiWorksDetail />}
          {category.id === 'editing' && <EditingWorksDetail />}
        </div>
      </section>
    </div>
  )
}

function Skills() {
  return (
    <section className="skills section" id="skills">
      <div className="container">
        <SectionHeader number="04" title="个人优势" description="从硬技能到软实力，构建完整能力矩阵" />
        <div className="skills__grid">
          {skills.map(([code, title, items], index) => (
            <article className="skill-card" key={title} data-reveal style={{ '--delay': `${index * 70}ms` }}>
              <span className="skill-card__code" aria-hidden="true">{code}</span><h3>{title}</h3>
              <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer({ onOpenContact, contactButtonRef }) {
  return (
    <footer className="footer" id="contact">
      <div className="footer__orb footer__orb--one" /><div className="footer__orb footer__orb--two" />
      <div className="footer__content" data-reveal>
        <span className="footer__number">05 / CONTACT</span>
        <h2>让我们聊聊<br />你的下一个项目</h2>
        <p>如果你正在寻找一个能将数据分析与创意设计结合的伙伴，<br />欢迎联系我，一起探索数据背后的故事。</p>
        <div className="footer__actions">
          <a className="button button--dark" href={`mailto:${EMAIL}`}>发送邮件 <span aria-hidden="true">↗</span></a>
          <button ref={contactButtonRef} className="button button--light" type="button" onClick={onOpenContact}>微信联系</button>
        </div>
        <div className="footer__info">
          <div><span>Email</span><a href={`mailto:${EMAIL}`}>{EMAIL}</a></div>
          <div><span>所在地</span><strong>中国 · 重庆</strong></div>
          <div><span>状态</span><strong className="status">开放合作</strong></div>
        </div>
        <p className="footer__copyright">© 2026 丁垚鑫 · 保留所有权利</p>
      </div>
    </footer>
  )
}

function ContactModal({ open, onClose, triggerRef }) {
  const [qrSrc, setQrSrc] = useState('')

  useEffect(() => {
    let active = true
    import('./wechatQrData.js').then(({ default: source }) => {
      if (active) setQrSrc(source)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.body.classList.add('modal-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [open, onClose, triggerRef])

  return (
    <div className={`modal-overlay${open ? ' modal-overlay--open' : ''}`} aria-hidden={!open} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button autoFocus className="contact-modal__close" type="button" onClick={onClose} aria-label="关闭联系方式"><span aria-hidden="true">×</span></button>
        <div className="contact-modal__mark">
          {qrSrc ? <img src={qrSrc} alt="丁垚鑫的微信二维码" /> : <span className="contact-modal__loading">二维码加载中</span>}
        </div>
        <p className="contact-modal__eyebrow">WECHAT CONTACT</p>
        <h2 id="contact-title">微信联系</h2>
        <p className="contact-modal__hint">请在微信中搜索以下手机号添加好友</p>
        <a className="contact-modal__phone" href={`tel:${PHONE}`}>{PHONE}</a>
        <p className="contact-modal__note">添加时请备注来意</p>
      </section>
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const contactButtonRef = useRef(null)
  const projectTriggerRef = useRef(null)
  useRevealOnScroll()
  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <Navigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main id="main-content"><Hero /><Experience /><Projects onOpen={(projectId, trigger) => { projectTriggerRef.current = trigger; setActiveProject(projectId) }} /><GameShowcase /><Skills /></main>
      <Footer contactButtonRef={contactButtonRef} onOpenContact={() => setContactOpen(true)} />
      {activeProject && <ProjectModal categoryId={activeProject} onClose={() => setActiveProject(null)} triggerRef={projectTriggerRef} />}
      {contactOpen && <ContactModal open onClose={() => setContactOpen(false)} triggerRef={contactButtonRef} />}
    </>
  )
}
