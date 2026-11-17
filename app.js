(function () {
  'use strict';

  const history = window.HISTORY && typeof window.HISTORY === 'object' ? window.HISTORY : {};
  const events = Array.isArray(history.events) ? history.events : [];
  const leaders = Array.isArray(history.leaders) ? history.leaders : [];
  const organization = Array.isArray(history.organization) ? history.organization : [];
  const anniversaries = Array.isArray(history.anniversaries) ? history.anniversaries : [];
  const chapters = Array.isArray(history.chapters) ? history.chapters : [];
  const gaps = Array.isArray(history.gaps) ? history.gaps : [];
  const visuals = Array.isArray(history.visuals) ? history.visuals : [];
  const redesigns = Array.isArray(history.redesigns) ? history.redesigns : [];
  const voices = Array.isArray(history.voices) ? history.voices : [];
  const quiz = Array.isArray(history.quiz) ? history.quiz : [];
  const glossary = Array.isArray(history.glossary) ? history.glossary : [];
  const domains = Array.isArray(history.domains) ? history.domains : [];
  const celebration = history.celebration && typeof history.celebration === 'object' ? history.celebration : null;
  const numbers = history.numbers && typeof history.numbers === 'object' ? history.numbers : null;
  const eras = {
    '2007-2008': { label: '2007—2008 的样子', note: '开站头两年的河畔，只留下首页底部的在线名单截图和四版 Logo。这个皮肤里 Logo 是原图，其余版面是照这些碎片补出来的。' },
    '2009-2012': { label: '照 2010 年首页做的', note: '三栏榜单照的是 2010 年 11 月 13 日那张“字体很模糊”的投诉截图：彩色排名数字、浅青底、细边框。页头的纸船 Logo、蓝色底和导航条是原图，取自互联网档案馆 2013 年 7 月存下的首页——那是 PHPWind 时代留下的最完整的一张。' },
    '2013-2023': { label: 'Discuz 版的样子', note: '2013 年换上的 Discuz 界面，一直用到今天。这里的 Logo、导航条和栏目条，都取自现在还在运行的旧版页面。' },
    '2024-2026': { label: '新版河畔的样子', note: '2024 年 5 月上线的新版：蓝色顶栏、校景横幅、大公告条。照 2026 年 11 月的页面做的。' },
    '2026-riverside': { label: 'Riverside 的样子', note: '照 2026 年 11 月 16 日保存的 Riverside 十九周年活动帖页面做的：浅蓝紫的底、白色圆角内容区、靛紫色按钮和左侧栏。站标和两枚徽章是原图，侧栏里的条目换成了本页的栏目。' }
  };
  const RIVERSIDE = '2026-riverside';
  const ERA_KEY = 'hepan-history-era';
  const wideScreen = window.matchMedia('(min-width:1000px)');
  let lastEra = null;
  let visualEra = '';
  let anniversaryYear = 2026;

  function storedEra() {
    try { const value = window.localStorage.getItem(ERA_KEY); return eras[value] ? value : ''; } catch (_) { return ''; }
  }

  function syncSidebar() {
    // Riverside 的左侧栏在宽屏上默认展开；窄屏和其余皮肤默认收起。
    const open = document.body.dataset.era === RIVERSIDE && wideScreen.matches;
    $('#primary-nav').classList.toggle('is-open', open);
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
  }
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function valueText(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join('、');
    if (typeof value === 'object') {
      for (const key of ['text', 'summary', 'title', 'name', 'label', 'value']) {
        if (value[key] != null) return valueText(value[key]);
      }
      return '';
    }
    return String(value).trim();
  }

  function paragraphs(value, className) {
    if (value == null || value === '') return '';
    const pieces = Array.isArray(value) ? value : String(value).split(/\n\s*\n/);
    return pieces.map((piece) => valueText(piece)).filter(Boolean)
      .map((piece) => `<p${className ? ` class="${className}"` : ''}>${escapeHtml(piece)}</p>`).join('');
  }

  function safeUrl(value) {
    const raw = valueText(value);
    if (!raw) return '';
    try {
      const parsed = new URL(raw, window.location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function sourceMarkup(sources, emptyText) {
    const list = Array.isArray(sources) ? sources.filter((source) => source && typeof source === 'object') : [];
    if (!list.length) return emptyText ? `<span class="source-missing">${escapeHtml(emptyText)}</span>` : '';
    return `<div class="source-list">${list.map((source) => {
      const url = safeUrl(source.url);
      const title = valueText(source.title) || '原帖';
      const label = url
        ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}${source.tid ? ` <span aria-label="主题编号">#${escapeHtml(source.tid)}</span>` : ''}</a>`
        : `<span class="source-link">${escapeHtml(title)}</span>`;
      const meta = [valueText(source.site), valueText(source.date)].filter(Boolean).map(escapeHtml).join(' · ');
      return `${label}${meta ? `<span class="source-meta">${meta}</span>` : ''}`;
    }).join('')}</div>`;
  }

  function evidenceStatus(record) {
    // 出处标签在生成数据时已经归并成少数几种，这里只管配色。
    const label = valueText(record && record.confidence);
    if (!label) return null;
    const kind = /待证/.test(label) ? 'pending' : /回忆|自述|追记/.test(label) ? 'memory' : /存档/.test(label) ? 'archive' : 'contemporary';
    return { label, kind };
  }

  function evidenceBadge(record) {
    const status = evidenceStatus(record);
    if (!status) return '';
    return `<span class="evidence-badge status-${escapeHtml(status.kind)}"><i class="status-dot status-${escapeHtml(status.kind)}" aria-hidden="true"></i>${escapeHtml(status.label)}</span>`;
  }

  function findYear(record) {
    const direct = valueText(record && record.year).match(/(?:19|20)\d{2}/);
    if (direct) return Number(direct[0]);
    const date = valueText(record && record.date).match(/(?:19|20)\d{2}/);
    return date ? Number(date[0]) : null;
  }

  function eraFromYear(year) {
    const numeric = Number(year);
    if (numeric >= 2007 && numeric <= 2008) return '2007-2008';
    if (numeric >= 2009 && numeric <= 2012) return '2009-2012';
    if (numeric >= 2013 && numeric <= 2023) return '2013-2023';
    if (numeric >= 2024 && numeric <= 2026) return '2024-2026';
    return '';
  }

  function setEra(era) {
    if (!eras[era]) return;
    document.body.dataset.era = era;
    $$('#era-switcher [data-era]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.era === era)));
    $('#era-band-current').textContent = eras[era].label;
    $('#era-style-note').textContent = eras[era].note;
    if (era !== lastEra) {
      lastEra = era;
      syncSidebar();
      try { window.localStorage.setItem(ERA_KEY, era); } catch (_) { /* 存不了就算了，下次从默认皮肤开始 */ }
    }
    renderTopicColumns();
    // 换皮肤时，界面档案跟着翻到这个年代；之后可以用档案自己的标签另外翻看。
    renderVisualArchive(era);
  }

  function displayDate(record) {
    const date = valueText(record && record.date);
    if (date) return date;
    const year = valueText(record && record.year);
    return year || '日期不详';
  }

  function periodFor(record) {
    const year = findYear(record);
    if (!year) return 'unknown';
    if (year <= 2006 && year >= 1997) return '1997-2006';
    if (year >= 2007 && year <= 2009) return '2007-2009';
    if (year >= 2010 && year <= 2013) return '2010-2013';
    if (year >= 2014 && year <= 2019) return '2014-2019';
    if (year >= 2020 && year <= 2026) return '2020-2026';
    return 'unknown';
  }

  function eventSearchText(event) {
    const sourceTitles = (Array.isArray(event.sources) ? event.sources : []).map((source) => valueText(source && source.title)).join(' ');
    return [event.id, event.date, event.year, event.title, event.category, event.summary, event.details,
      ...(Array.isArray(event.tags) ? event.tags : []), sourceTitles].map(valueText).join(' ').toLocaleLowerCase();
  }

  function renderOverview() {
    const overview = history.overview;
    const deck = $('#hero-deck');
    const lead = overview && typeof overview === 'object' && !Array.isArray(overview)
      ? ['summary', 'introduction', 'lead', 'description'].map((key) => valueText(overview[key])).find(Boolean)
      : valueText(overview);
    if (lead) deck.textContent = lead;

    const facts = $('#overview-facts');
    if (!overview || typeof overview !== 'object' || Array.isArray(overview)) {
      facts.innerHTML = '';
      return;
    }
    const labels = {
      summary: '全景摘要', introduction: '引言', lead: '导读', description: '概述', conclusion: '编年结论',
      mainConclusion: '编年结论', scope: '写到哪', method: '怎么核对', note: '没查清的', basis: '时间依据'
    };
    const entries = Object.entries(overview).filter(([key, val]) => !['summary', 'introduction', 'lead', 'description'].includes(key) && valueText(val));
    facts.innerHTML = entries.length ? entries.map(([key, val]) => `
      <div class="overview-fact"><span class="overview-fact-label">${escapeHtml(labels[key] || key)}</span><p class="overview-fact-value">${escapeHtml(valueText(val))}</p></div>
    `).join('') : '';
  }

  function renderStats() {
    const stats = history.stats && typeof history.stats === 'object' ? history.stats : {};
    const definitions = [
      ['threads', '引用原帖'], ['posts', '读过的楼层'], ['voices', '畔友原话']
    ];
    const items = definitions.filter(([key]) => stats[key] !== undefined && stats[key] !== null && stats[key] !== '')
      .map(([key, label]) => `<div class="stat-item"><strong>${escapeHtml(stats[key])}</strong><span>${label}</span></div>`);
    $('#archive-stats').innerHTML = items.join('');
  }

  function renderTopicColumns() {
    const ordered = events.map((event, index) => ({ event, index })).sort((a,b) => valueText(b.event.date).localeCompare(valueText(a.event.date)));
    const foundational = [...ordered].reverse();
    const technical = ordered.filter(({event}) => valueText(event.category) === '技术演进');
    const riverside = document.body.dataset.era === RIVERSIDE;
    const era = riverside ? '2024-2026' : document.body.dataset.era;
    const said = voices.map((voice, index) => ({ voice, index }));
    const eraVoices = said.filter(({ voice }) => eraFromYear(voice.year) === era);
    // 本年代的原话排前面，不足十句用其他年代的补齐，三栏保持等高。
    const voiceItems = (riverside ? [...eraVoices].reverse() : eraVoices).concat(said.filter((item) => !eraVoices.includes(item))).slice(0, 10);
    const titles = riverside
      ? ['最新 · 纪事选读', '热门 · 畔友原话', '类别 · 技术演进']
      : ['最新回复主题 · 纪事选读', '最新发表主题 · 畔友原话', 'FTP资源 · 技术史索引'];
    const columns = [
      {title:titles[0],items:ordered},
      {title:'最新发表主题 · 早年回望',items:foundational},
      {title:titles[2],items:technical}
    ];
    if (voiceItems.length) columns[1] = {title:titles[1],voices:voiceItems};
    if(era === '2007-2008') columns.push({title:'最新新闻 · 组织与站务',items:ordered.filter(({event})=>/站长|组织|站务|学生之家/.test(eventSearchText(event)))});
    const row = (rank, attribute, text) => `<li><span class="rank">${rank+1}</span><button type="button" ${attribute} title="${escapeHtml(text)}">${escapeHtml(text)}</button></li>`;
    $('#topic-columns').innerHTML=columns.map(column=>`<div class="topic-column"><h3>${column.title}</h3><ol>${column.voices
      ? column.voices.map(({voice,index},rank)=>row(rank, `data-voice-index="${index}"`, valueText(voice.text).split('\n')[0])).join('')
      : column.items.slice(0,10).map(({event,index},rank)=>row(rank, `data-event-index="${index}"`, valueText(event.title))).join('')}</ol></div>`).join('');
  }

  function renderCategoryOptions() {
    const select = $('#category-filter');
    const categories = [...new Set(events.map((event) => valueText(event.category)))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    select.insertAdjacentHTML('beforeend', categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(''));
  }

  function renderEventItem(event, index) {
    const date = displayDate(event);
    const year = findYear(event);
    const category = valueText(event.category);
    const title = valueText(event.title);
    const summary = valueText(event.summary);
    return `<article class="timeline-item">
      <time class="timeline-date">${escapeHtml(date)}${year ? `<small>${year} 年</small>` : ''}</time>
      <div class="timeline-entry">
        <div class="timeline-meta"><span class="category-label">${escapeHtml(category)}</span>${evidenceBadge(event)}</div>
        <button class="timeline-title" type="button" data-event-index="${index}">${escapeHtml(title)}</button>
        ${summary ? `<p class="timeline-summary">${escapeHtml(summary)}</p>` : ''}
        <button class="timeline-open" type="button" data-event-index="${index}" aria-label="查看：${escapeHtml(title)}">↗</button>
      </div>
    </article>`;
  }

  function renderTimeline() {
    const query = $('#timeline-search').value.trim().toLocaleLowerCase();
    const category = $('#category-filter').value;
    const period = $('#period-filter').value;
    const filtered = events.map((event, index) => ({ event, index })).filter(({ event }) => {
      const eventCategory = valueText(event.category);
      return (!query || eventSearchText(event).includes(query)) && (!category || eventCategory === category) && (!period || periodFor(event) === period);
    }).sort((a, b) => {
      const ay = findYear(a.event) || Infinity;
      const by = findYear(b.event) || Infinity;
      if (ay !== by) return ay - by;
      return valueText(a.event.date).localeCompare(valueText(b.event.date), 'zh-CN');
    });
    $('#timeline-result').textContent = filtered.length === events.length ? `共 ${events.length} 条` : `${filtered.length} / ${events.length} 条`;
    const list = $('#timeline-list');
    list.innerHTML = filtered.length
      ? filtered.map(({ event, index }) => renderEventItem(event, index)).join('')
      : `<div class="empty-state"><strong>没有找到</strong>换个关键词，或者点“清除筛选”。</div>`;
  }

  function renderEventDialog(index) {
    const event = events[index];
    if (!event) return;
    const title = valueText(event.title);
    const details = valueText(event.details);
    const tags = Array.isArray(event.tags) ? event.tags.map(valueText).filter(Boolean) : [];
    $('#dialog-content').innerHTML = `<div class="dialog-content">
      <div class="dialog-meta"><span>${escapeHtml(displayDate(event))}</span><span>${escapeHtml(valueText(event.category))}</span>${evidenceBadge(event)}</div>
      <h2 id="dialog-title">${escapeHtml(title)}</h2>
      ${tags.length ? `<p class="dialog-tags">${tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('')}</p>` : ''}
      <div class="dialog-body">${paragraphs(event.summary, 'dialog-summary')}${details && details !== valueText(event.summary) ? `<h3 class="dialog-note-title">${valueText(event.category) === '畔庆' ? '这一年办了什么' : '补记'}</h3>${paragraphs(details, 'dialog-note')}` : ''}</div>
      <div class="dialog-sources"><h3>原帖</h3>${sourceMarkup(event.sources, '')}</div>
    </div>`;
    const dialog = $('#event-dialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function leaderGroup(record) {
    const branch = record && record.span ? valueText(record.span.branch) : '';
    return ['general', 'frontend', 'backend'].includes(branch) ? branch : 'other';
  }

  function sortLeaders(list) {
    const started = (leader) => (leader.span && leader.span.start ? Date.parse(leader.span.start) : Infinity);
    return [...list].sort((a, b) => started(a) - started(b));
  }

  function renderLeader(record) {
    const start = valueText(record.start);
    const end = valueText(record.end);
    const tenure = start || end ? `${start || '？'} — ${end || '？'}` : '任期不详';
    return `<article class="leader-row">
      <div><h4 class="leader-name">${escapeHtml(valueText(record.name))}</h4><p class="leader-tenure">${escapeHtml(tenure)}</p><span class="role-chip">${escapeHtml(valueText(record.role))}</span></div>
      <div><p class="leader-copy">${escapeHtml(valueText(record.summary))}</p>${evidenceBadge(record)}${sourceMarkup(record.sources, '')}</div>
    </article>`;
  }

  function renderLeaders() {
    const groups = {
      general: { title: '站长', note: '2007—2014，2018 至今' },
      frontend: { title: '前台站长', note: '2014—2018 · 管运营和前台事务' },
      backend: { title: '后台站长', note: '2014—2018 · 管服务器、人事和招商' },
      other: { title: '另外两位', note: '常被算进站长，但没有任命公告' }
    };
    $('#leader-list').innerHTML = Object.entries(groups).map(([key, group]) => {
      const rows = sortLeaders(leaders.filter((leader) => leaderGroup(leader) === key));
      if (!rows.length) return '';
      return `<section class="steward-column steward-${key}" aria-label="${escapeHtml(group.title)}">
        <div class="column-heading"><h3>${escapeHtml(group.title)}</h3><span>${escapeHtml(group.note)}</span></div>
        ${rows.map(renderLeader).join('')}
      </section>`;
    }).join('');
  }

  function renderOrganization() {
    const list = $('#organization-list');
    if (!organization.length) {
      list.innerHTML = '';
      return;
    }
    const ordered = [...organization].sort((a, b) => {
      const ay = findYear(a) || Infinity;
      const by = findYear(b) || Infinity;
      return ay - by;
    });
    list.innerHTML = ordered.map((item) => `<article class="organization-row">
      <span class="organization-date">${escapeHtml(displayDate(item))}</span>
      <div><h4>${escapeHtml(valueText(item.title))}</h4><p>${escapeHtml(valueText(item.summary))}</p>${evidenceBadge(item)}${sourceMarkup(item.sources, '')}</div>
    </article>`).join('');
  }

  function renderAnniversaries() {
    const select = $('#anniversary-year');
    for (let year = 2008; year <= 2026; year += 1) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = `${year} 年 · ${year - 2007} 周年`;
      select.appendChild(option);
    }
    select.addEventListener('change', () => showAnniversary(Number(select.value)));
    $('#anniversary-prev').addEventListener('click', () => showAnniversary(anniversaryYear - 1));
    $('#anniversary-next').addEventListener('click', () => showAnniversary(anniversaryYear + 1));
    showAnniversary(2026);
  }

  function showAnniversary(wanted) {
    const year = Math.min(2026, Math.max(2008, Number(wanted) || 2026));
    anniversaryYear = year;
    $('#anniversary-year').value = String(year);
    $('#anniversary-prev').disabled = year <= 2008;
    $('#anniversary-next').disabled = year >= 2026;
    $$('#candle-strip [data-candle-year]').forEach((candle) => candle.setAttribute('aria-pressed', String(Number(candle.dataset.candleYear) === year)));
    const records = anniversaries.filter((entry) => findYear(entry) === year);
    const container = $('#anniversary-detail');
    if (!records.length) {
      container.innerHTML = `<div class="anniversary-year-large">${year}</div><div class="anniversary-pending"><strong>这一年的记录还没补上</strong></div>`;
      return;
    }
    const content = records.map((entry) => {
      const activities = Array.isArray(entry.activities) ? entry.activities.map(valueText).filter(Boolean) : [];
      const theme = valueText(entry.theme);
      const status = valueText(entry.status);
      return `<article class="anniversary-content">
        ${valueText(entry.number) ? `<span class="anniversary-number">第 ${escapeHtml(valueText(entry.number))} 个生日${status && !/^found$/i.test(status) ? ` · ${escapeHtml(status)}` : ''}</span>` : ''}
        <h3>${escapeHtml(valueText(entry.title) || `${year} 年畔庆`)}</h3>
        ${theme && !/^(无|未设主题|未找到|未见)/.test(theme) ? `<p class="anniversary-theme">主题：${escapeHtml(theme)}</p>` : ''}
        ${paragraphs(entry.summary)}
        ${activities.length ? `<ul class="anniversary-activities">${activities.map((activity) => `<li>${escapeHtml(activity)}</li>`).join('')}</ul>` : ''}
        ${evidenceBadge(entry)}${sourceMarkup(entry.sources, '')}
      </article>`;
    }).join('');
    container.innerHTML = `<div class="anniversary-year-large">${year}</div><div>${content}</div>`;
  }

  function renderChapters() {
    const list = $('#chapter-list');
    if (!chapters.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = chapters.map((chapter) => {
      const body = valueText(chapter.body);
      return `<article class="chapter-row">
        <p class="chapter-kicker">${escapeHtml(valueText(chapter.kicker))}</p>
        <div class="chapter-content"><h3>${escapeHtml(valueText(chapter.title))}</h3>
          ${paragraphs(chapter.summary)}
          ${body ? `<details class="chapter-body"><summary>展开全文</summary><div>${escapeHtml(body)}</div></details>` : ''}
          ${sourceMarkup(chapter.sources, '')}
        </div>
      </article>`;
    }).join('');
  }

  function renderGaps() {
    $('#gaps-list').innerHTML = gaps.map((gap) => `<article class="gap-row">
      <div><h4>${escapeHtml(valueText(gap.title))}</h4></div>
      <div><p>${escapeHtml(valueText(gap.summary))}</p>${sourceMarkup(gap.sources, '')}</div>
    </article>`).join('');
  }

  function normalizeImagePath(value) {
    const raw = valueText(value).replace(/\\/g, '/');
    if (!raw || raw.startsWith('/') || raw.includes('..') || !/^assets\/history\/[\w./-]+$/i.test(raw)) return '';
    return raw;
  }

  const VISUAL_KINDS = {
    riverside_badge: { label: 'Riverside 徽章', className: 'riverside', era: RIVERSIDE },
    logo: { label: 'Logo', className: 'logo' },
    statistics_strip: { label: '首页局部', className: 'stats' },
    forum_home_crop: { label: '首页截图', className: 'screenshot' },
    editor_crop: { label: '页面截图', className: 'screenshot' },
    related_community_screenshot: { label: '别的论坛', className: 'screenshot' },
    current_legacy: { label: '今天的旧版', className: 'page', era: '2013-2023' },
    current_modern: { label: '今天的新版', className: 'modern', era: '2024-2026' },
    archive_page: { label: '网页存档', className: 'archive' },
    archive_reference: { label: '网页存档', className: 'other' }
  };

  function visualType(visual) {
    return VISUAL_KINDS[valueText(visual.kind)] || { label: '图像', className: 'other' };
  }

  function visualEraOf(visual) {
    const type = visualType(visual);
    if (visual.era) return valueText(visual.era);
    if (type.era) return type.era;
    const year = valueText(visual.period).match(/(?:19|20)\d{2}/);
    return year ? eraFromYear(Number(year[0])) : '';
  }

  function renderVisualEntry(visual, index) {
    const image = normalizeImagePath(visual.image);
    const kind = visualType(visual);
    const title = valueText(visual.title) || kind.label;
    const caption = valueText(visual.caption);
    const preview = image
      ? `<button class="visual-open" type="button" data-visual-index="${index}" aria-label="放大查看：${escapeHtml(title)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy"></button>`
      : `<div class="visual-text-only">没有图<small>只有一条存档记录</small></div>`;
    return `<article class="visual-entry">
      <div class="visual-preview image-kind-${escapeHtml(kind.className)}">${preview}</div>
      <div class="visual-copy">
        <div class="visual-meta"><span class="visual-period">${escapeHtml(valueText(visual.period))}</span><span class="visual-kind">${escapeHtml(kind.label)}</span></div>
        <h4>${escapeHtml(title)}</h4><p>${escapeHtml(caption)}</p>
        ${sourceMarkup(visual.sources, '')}
      </div>
    </article>`;
  }

  function renderVisualArchive(era) {
    const container = $('#visual-archive');
    if (!container) return;
    visualEra = era || '';
    $$('#visual-filters [data-visual-era]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.visualEra === visualEra)));
    const selected = visuals.map((visual, index) => ({ visual, index })).filter(({ visual }) => !visualEra || visualEraOf(visual) === visualEra);
    $('#visual-result').textContent = `${selected.length} / ${visuals.length} 项`;
    container.innerHTML = selected.length
      ? selected.map(({ visual, index }) => renderVisualEntry(visual, index)).join('')
      : `<div class="empty-state"><strong>这个年代还没有找到图</strong></div>`;
  }

  function renderRedesigns() {
    const container = $('#redesign-list');
    if (!container) return;
    const sorted = [...redesigns].sort((a, b) => (findYear(a) || Infinity) - (findYear(b) || Infinity));
    container.innerHTML = sorted.map((item) => `<article class="redesign-row">
        <span class="redesign-date">${escapeHtml(valueText(item.date))}</span>
        <div><h4>${escapeHtml(valueText(item.title))}</h4>${valueText(item.scope) ? `<span class="redesign-scope">${escapeHtml(valueText(item.scope))}</span>` : ''}</div>
        <div><p>${escapeHtml(valueText(item.summary))}</p>${sourceMarkup(item.sources, '')}</div>
      </article>`).join('');
  }

  function renderImageDialog(index) {
    const visual = visuals[index];
    if (!visual) return;
    const image = normalizeImagePath(visual.image);
    if (!image) return;
    const kind = visualType(visual);
    const title = valueText(visual.title) || kind.label;
    const dialog = $('#image-dialog');
    $('#image-dialog-content').innerHTML = `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">
      <h2 id="image-dialog-title">${escapeHtml(title)}</h2>
      <p>${escapeHtml(valueText(visual.period))} · ${escapeHtml(kind.label)}</p>
      <p>${escapeHtml(valueText(visual.caption))}</p><div>${sourceMarkup(visual.sources, '')}</div>`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function wireNavigation() {
    const menu = $('#menu-toggle');
    const nav = $('#primary-nav');
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    $$('.nav-inner a').forEach((link) => link.addEventListener('click', () => {
      // Riverside 宽屏下导航是常驻的左侧栏，点了条目不收起。
      if (document.body.dataset.era === RIVERSIDE && wideScreen.matches) return;
      menu.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }));
    // 当前所在栏目：取顶边已越过视口上部 30% 的最后一个版块；还没滚到任何版块时算在首页。
    const sections = $$('.section[id]');
    const links = $$('.nav-inner a');
    let ticking = false;
    const markCurrent = () => {
      ticking = false;
      const line = window.innerHeight * 0.3;
      let current = '';
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= line) current = `#${section.id}`;
      });
      links.forEach((link, index) => {
        const on = current ? link.getAttribute('href') === current : index === 0;
        if (on) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(markCurrent);
    }, { passive: true });
    markCurrent();
  }

  function wireTimeline() {
    renderCategoryOptions();
    // 搜索框只听 input：失焦时的 change 会在鼠标按下与抬起之间重绘列表，吞掉对结果的第一次点击。
    $('#timeline-search').addEventListener('input', renderTimeline);
    $('#category-filter').addEventListener('change', renderTimeline);
    $('#period-filter').addEventListener('change', renderTimeline);
    $('#timeline-filters').addEventListener('reset', () => window.setTimeout(renderTimeline, 0));
    $('#timeline-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-event-index]');
      if (button) renderEventDialog(Number(button.dataset.eventIndex));
    });
    $$('.period-list a[data-period-link]').forEach((link) => link.addEventListener('click', () => {
      // 导读里的分期入口：只按年代筛，别的条件清掉，免得筛出空表。
      $('#timeline-search').value = '';
      $('#category-filter').value = '';
      $('#period-filter').value = link.dataset.periodLink;
      renderTimeline();
    }));
    renderTimeline();
    $('#topic-columns').addEventListener('click', (event) => {
      const button=event.target.closest('[data-event-index]');
      if(button) renderEventDialog(Number(button.dataset.eventIndex));
      const said=event.target.closest('[data-voice-index]');
      if(said) renderVoiceDialog(Number(said.dataset.voiceIndex));
    });
    $('#forum-search').addEventListener('submit',(event)=>{
      event.preventDefault();
      // 页头搜索是全站搜索：清掉类别和年代筛选，否则结果会被先前的筛选藏起来。
      $('#timeline-search').value=$('#forum-search-input').value.trim();
      $('#category-filter').value='';
      $('#period-filter').value='';
      renderTimeline();
      $('#timeline').scrollIntoView({behavior:'smooth'});
    });
  }

  function wireDialog() {
    const dialog = $('#event-dialog');
    $('.dialog-close', dialog).addEventListener('click', () => dialog.close ? dialog.close() : dialog.removeAttribute('open'));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close ? dialog.close() : dialog.removeAttribute('open');
    });
    dialog.addEventListener('close', () => {
      const active = document.activeElement;
      if (active && active.matches('[data-event-index]')) active.focus();
    });
  }

  function wireEraControls() {
    $('#era-switcher').addEventListener('click', (event) => {
      const button = event.target.closest('[data-era]');
      if (button) setEra(button.dataset.era);
    });
    $('#visual-archive').addEventListener('click', (event) => {
      const button = event.target.closest('[data-visual-index]');
      if (button) renderImageDialog(Number(button.dataset.visualIndex));
    });
    $('#visual-archive').addEventListener('error', (event) => {
      if (!event.target.matches('img')) return;
      const button = event.target.closest('.visual-open');
      if (button) button.outerHTML = `<div class="visual-text-only">图没能加载</div>`;
    }, true);
    const dialog = $('#image-dialog');
    $('.image-dialog-close', dialog).addEventListener('click', () => dialog.close ? dialog.close() : dialog.removeAttribute('open'));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close ? dialog.close() : dialog.removeAttribute('open');
    });
    $('#visual-filters').addEventListener('click', (event) => {
      const button = event.target.closest('[data-visual-era]');
      if (button) renderVisualArchive(button.dataset.visualEra);
    });
    const onResize = () => { if (document.body.dataset.era === RIVERSIDE) syncSidebar(); };
    if (wideScreen.addEventListener) wideScreen.addEventListener('change', onResize);
    setEra(storedEra() || document.body.dataset.era || '2009-2012');
  }

  function applyUpdatedDate() {
    const updated = valueText(history.updated) || '2026-11-16';
    const top = $('#updated-at');
    const footer = $('#footer-updated');
    top.textContent = updated;
    footer.textContent = updated;
    if (/^\d{4}-\d{2}-\d{2}$/.test(updated)) top.dateTime = updated;
  }

  /* ---------- 十九周年专题 ---------- */

  const DAY = 86400000;
  const number = (value) => Number(value).toLocaleString('en-US');

  function openDialog(markup) {
    $('#dialog-content').innerHTML = markup;
    const dialog = $('#event-dialog');
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
  }

  function goToAnniversary(year) {
    showAnniversary(year);
    const section = $('#anniversaries');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.classList.remove('is-flash');
    void section.offsetWidth;
    section.classList.add('is-flash');
  }

  function renderCelebration() {
    const section = $('#nineteen');
    if (!section) return;
    if (!celebration) { section.hidden = true; return; }
    const opened = new Date(`${celebration.opened}T00:00:00+08:00`);
    const birthday = new Date(`${celebration.birthday}T00:00:00+08:00`);
    const now = new Date();
    $('#day-count').textContent = number(Math.max(0, Math.floor((now - opened) / DAY)));
    $('#celebration-title').textContent = valueText(celebration.title);
    $('#celebration-lead').textContent = valueText(celebration.lead);

    const since = Math.floor((now - birthday) / DAY);
    const seen = celebration.seen && typeof celebration.seen === 'object' ? celebration.seen : {};
    const asOf = valueText(seen.asOf).match(/^\d{4}-(\d{2})-(\d{2})$/);
    const age = Number.isNaN(since) ? '' : since < 0 ? `距十九岁生日还有 ${-since} 天。`
      : since === 0 ? '今天，河畔十九岁。' : since < 365 ? `河畔十九岁零 ${since} 天。` : '';
    const count = seen.posts && asOf
      ? `到 ${Number(asOf[1])} 月 ${Number(asOf[2])} 日，活动帖已有 ${number(seen.posts)} 楼，${number(seen.people)} 位畔友在楼里说过话。` : '';
    $('#celebration-status').textContent = `${age}${count}`;

    const badges = Array.isArray(celebration.badges) ? celebration.badges : [];
    $('#celebration-badges').innerHTML = badges.map((badge) => {
      const image = normalizeImagePath(badge.image);
      const name = valueText(badge.name);
      return image ? `<figure><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="92" height="92" loading="lazy"><figcaption><b>${escapeHtml(name)}</b><span>${escapeHtml(valueText(badge.rule))}</span></figcaption></figure>` : '';
    }).join('');

    const strip = $('#candle-strip');
    const ordered = [...anniversaries].sort((a, b) => findYear(a) - findYear(b));
    strip.innerHTML = ordered.map((entry) => {
      const year = findYear(entry);
      const quiet = /未举办|从简/.test(valueText(entry.status));
      return `<li><button type="button" class="candle${quiet ? ' is-quiet' : ''}${year === 2026 ? ' is-now' : ''}" data-candle-year="${year}">
        <b>${escapeHtml(valueText(entry.number))}</b><span>${year}</span><em>${escapeHtml(valueText(entry.highlight) || valueText(entry.theme) || '畔庆')}</em></button></li>`;
    }).join('');
    strip.addEventListener('click', (event) => {
      const button = event.target.closest('[data-candle-year]');
      if (button) goToAnniversary(Number(button.dataset.candleYear));
    });

    const steps = Array.isArray(celebration.steps) ? celebration.steps : [];
    const share = Array.isArray(celebration.share) ? celebration.share : [];
    const url = safeUrl(celebration.url);
    $('#celebration-detail').innerHTML = `<div class="celebration-card">
        <h4>怎么参加</h4>
        <p class="celebration-when">${escapeHtml(valueText(celebration.host))} · ${escapeHtml(valueText(celebration.board))}　${escapeHtml(valueText(celebration.posted))} 发布，全站置顶</p>
        <ol class="celebration-steps">${steps.map((step) => `<li>${escapeHtml(valueText(step))}</li>`).join('')}</ol>
        <p class="celebration-quote">“${escapeHtml(valueText(celebration.slogan))}”</p>
        ${url ? `<p><a class="celebration-cta" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">去 Riverside 看活动帖 ↗</a></p>` : ''}
        <p class="celebration-note">${escapeHtml(valueText(celebration.note))}</p>
        <p><button type="button" class="text-button" data-candle-year="2026">看这一届的完整记录 »</button></p>
      </div>
      <div class="celebration-card">
        <h4>可以分享些什么 <small>活动帖原文</small></h4>
        <dl class="share-list">${share.map((item) => `<div><dt>${escapeHtml(valueText(item.name))}</dt><dd>${escapeHtml(valueText(item.text))}</dd></div>`).join('')}</dl>
        <p class="celebration-more">${escapeHtml(valueText(celebration.more))}</p>
        <blockquote class="celebration-closing">${escapeHtml(valueText(celebration.closing))}</blockquote>
        <p class="celebration-aside">${escapeHtml(valueText(celebration.aside))}</p>
      </div>`;
    $('#celebration-detail').addEventListener('click', (event) => {
      const button = event.target.closest('[data-candle-year]');
      if (button) goToAnniversary(Number(button.dataset.candleYear));
    });
  }

  function renderNumbers() {
    const tiles = $('#milestone-tiles');
    const figure = $('#thread-figure');
    if (!numbers) { if (tiles) tiles.hidden = true; if (figure) figure.hidden = true; return; }
    const milestones = Array.isArray(numbers.milestones) ? numbers.milestones : [];
    tiles.innerHTML = milestones.map((item) => {
      const source = Array.isArray(item.sources) ? item.sources[0] : null;
      const url = source ? safeUrl(source.url) : '';
      return `<div class="milestone"><strong>${escapeHtml(valueText(item.value))}</strong><span>${escapeHtml(valueText(item.label))}</span>
        <small>${escapeHtml(valueText(item.when))}${url ? ` · <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">原帖</a>` : ''}</small></div>`;
    }).join('');

    const rows = Array.isArray(numbers.threadsByYear) ? numbers.threadsByYear : [];
    if (!rows.length) { figure.hidden = true; return; }
    const step = 100000;
    const top = Math.ceil(Math.max(...rows.map((row) => row.newThreads)) / step) * step;
    const ticks = [];
    for (let value = 0; value <= top; value += step) ticks.push(value);
    const full = rows.filter((row) => !row.partial);
    const peak = full.reduce((a, b) => (b.newThreads > a.newThreads ? b : a));
    const low = full.reduce((a, b) => (b.newThreads < a.newThreads ? b : a));
    const last = full[full.length - 1];
    const wan = (value) => (value === 0 ? '0' : `${value / 10000} 万`);
    const tip = (row) => `${row.year} 年${row.partial ? `（${row.partial}）` : ''}：约 ${number(row.newThreads)} 个新主题 · 年末编号 ${number(row.lastTid)}`;
    $('#thread-chart').innerHTML = `<div class="bar-chart">
      <div class="bar-y" aria-hidden="true">${ticks.map((value) => `<span style="bottom:${value / top * 100}%">${wan(value)}</span>`).join('')}</div>
      <div class="bar-area">${ticks.map((value) => `<i class="bar-grid" style="bottom:${value / top * 100}%"></i>`).join('')}
        ${rows.map((row) => {
          const height = row.newThreads / top * 100;
          const label = row.year === peak.year || row.year === last.year ? 'bar-value' : (row.year === low.year ? 'bar-value is-wide-only' : '');
          return `<button type="button" class="bar-col${row.partial ? ' is-partial' : ''}" data-tip="${escapeHtml(tip(row))}" aria-label="${escapeHtml(tip(row))}">
            ${label ? `<span class="${label}" style="bottom:calc(${height}% + 3px)">${(row.newThreads / 10000).toFixed(1)} 万</span>` : ''}
            <span class="bar" style="height:${height}%"></span><span class="bar-x">${String(row.year).slice(2)}</span></button>`;
        }).join('')}
      </div></div>`;
    const marks = Array.isArray(numbers.marks) ? numbers.marks : [];
    $('#thread-chart-marks').innerHTML = marks.map((mark) => `<span><b>${escapeHtml(valueText(mark.label))}</b> ${escapeHtml(valueText(mark.when))}</span>`).join('');
    const growth = numbers.growth && Array.isArray(numbers.growth.rows) ? numbers.growth.rows : [];
    const host = $('#growth-table');
    if (host) {
      host.innerHTML = growth.length ? `<p class="growth-note">${escapeHtml(valueText(numbers.growth.note))}</p>
        <div class="growth-scroll"><table><thead><tr><th>日期</th><th>主题</th><th>帖子</th><th>会员</th><th>单日最高</th><th>最多在线</th></tr></thead><tbody>
        ${growth.map((row) => {
          const url = safeUrl(row.url);
          const date = escapeHtml(valueText(row.date));
          return `<tr><td>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${date}</a>` : date}</td><td>${number(row.threads)}</td><td>${number(row.posts)}</td><td>${number(row.members)}</td><td>${number(row.peakDay)}</td><td>${number(row.peakOnline)}</td></tr>`;
        }).join('')}</tbody></table></div>` : '';
      $('#growth-block').hidden = !growth.length;
    }
    // Discuz 年代：首页上只有今日、昨日、帖子、会员
    const discuz = numbers.growth2 && Array.isArray(numbers.growth2.rows) ? numbers.growth2.rows : [];
    const discuzHost = $('#discuz-table');
    if (discuzHost) {
      discuzHost.innerHTML = discuz.length ? `<p class="growth-note">${escapeHtml(valueText(numbers.growth2.note))}</p>
        <div class="growth-scroll"><table><thead><tr><th>日期</th><th>帖子</th><th>会员</th><th>昨日发帖</th><th class="growth-what">这一天</th></tr></thead><tbody>
        ${discuz.map((row) => {
          const url = safeUrl(row.url);
          const date = escapeHtml(valueText(row.date));
          return `<tr><td>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${date}</a>` : date}</td><td>${number(row.posts)}</td><td>${number(row.members)}</td><td>${number(row.yesterday)}</td><td class="growth-what">${escapeHtml(valueText(row.note))}</td></tr>`;
        }).join('')}</tbody></table></div>` : '';
      $('#discuz-block').hidden = !discuz.length;
    }
    // 平常的一天发多少帖：一年里存档首页上“昨日”的中间值
    const daily = numbers.daily && Array.isArray(numbers.daily.rows) ? numbers.daily.rows : [];
    const dailyFigure = $('#daily-figure');
    if (dailyFigure) {
      dailyFigure.hidden = !daily.length;
      if (daily.length) {
        const dailyStep = 2000;
        const dailyTop = Math.ceil(Math.max(...daily.map((row) => row.median)) / dailyStep) * dailyStep;
        const dailyTicks = [];
        for (let value = 0; value <= dailyTop; value += dailyStep) dailyTicks.push(value);
        const qian = (value) => (value === 0 ? '0' : (value >= 10000 ? `${value / 10000} 万` : `${value / 1000} 千`));
        const high = daily.reduce((a, b) => (b.median > a.median ? b : a));
        const quiet = daily.reduce((a, b) => (b.median < a.median ? b : a));
        const labelled = new Set([daily[0].year, high.year, quiet.year]);
        const dailyTip = (row) => `${row.year} 年：平常的一天 ${number(row.median)} 帖 · 存档 ${row.days} 天`;
        $('#daily-chart').innerHTML = `<div class="bar-chart">
          <div class="bar-y" aria-hidden="true">${dailyTicks.map((value) => `<span style="bottom:${value / dailyTop * 100}%">${qian(value)}</span>`).join('')}</div>
          <div class="bar-area">${dailyTicks.map((value) => `<i class="bar-grid" style="bottom:${value / dailyTop * 100}%"></i>`).join('')}
            ${daily.map((row) => {
              const height = row.median / dailyTop * 100;
              return `<button type="button" class="bar-col" data-tip="${escapeHtml(dailyTip(row))}" aria-label="${escapeHtml(dailyTip(row))}">
                ${labelled.has(row.year) ? `<span class="bar-value" style="bottom:calc(${height}% + 3px)">${number(row.median)}</span>` : ''}
                <span class="bar" style="height:${height}%"></span><span class="bar-x">${String(row.year).slice(2)}</span></button>`;
            }).join('')}
          </div></div>`;
        $('#daily-note').textContent = valueText(numbers.daily.note);
        $('#daily-table').innerHTML = `<table><thead><tr><th>年份</th><th>平常的一天（帖）</th><th>存档天数</th></tr></thead><tbody>
          ${daily.map((row) => `<tr><td>${row.year}</td><td>${number(row.median)}</td><td>${number(row.days)}</td></tr>`).join('')}
          </tbody></table>`;
      }
    }
    $('#thread-chart-table').innerHTML = `<p>${escapeHtml(valueText(numbers.method))}</p>
      <table><thead><tr><th>年份</th><th>新开主题（估）</th><th>年末主题编号</th><th>分界误差</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${row.year}${row.partial ? `<small>（${escapeHtml(row.partial)}）</small>` : ''}</td><td>${number(row.newThreads)}</td><td>${number(row.lastTid)}</td><td>${row.margin ? `±${number(row.margin)}` : '—'}</td></tr>`).join('')}
      </tbody></table>
      <ul>${marks.map((mark) => `<li>${escapeHtml(valueText(mark.label))}：${escapeHtml(valueText(mark.when))}。${escapeHtml(valueText(mark.note))}</li>`).join('')}</ul>`;
  }

  function renderTenure() {
    const host = $('#tenure-chart');
    if (!host) return;
    const rows = leaders.filter((leader) => leader.span && typeof leader.span === 'object');
    if (!rows.length) { host.hidden = true; return; }
    const t0 = Date.UTC(2007, 0, 1);
    const t1 = Date.UTC(2027, 0, 1);
    const position = (time) => Math.min(100, Math.max(0, (time - t0) / (t1 - t0) * 100));
    const parse = (value) => (value ? Date.parse(`${value}T00:00:00Z`) : NaN);
    const dataDate = parse(valueText(history.updated)) || Date.now();
    const branches = {
      general: '站长', frontend: '前台站长', backend: '后台站长', other: '其他'
    };
    const ordered = [...rows].sort((a, b) => (parse(a.span.start) || Infinity) - (parse(b.span.start) || Infinity));
    const ticks = [2008, 2011, 2014, 2017, 2020, 2023, 2026];
    host.innerHTML = `<div class="tenure-legend">${Object.entries(branches).map(([key, label]) => `<span><i class="tenure-swatch branch-${key}"></i>${label}</span>`).join('')}</div>
      <div class="tenure-body"><div class="tenure-axis" aria-hidden="true">${ticks.map((year) => `<span style="left:${position(Date.UTC(year, 0, 1))}%">${year}</span>`).join('')}</div>
      <div class="tenure-grid" aria-hidden="true">${ticks.map((year) => `<i style="left:${position(Date.UTC(year, 0, 1))}%"></i>`).join('')}</div>
      ${ordered.map((leader) => {
        const name = valueText(leader.name).replace(/（UID.*?）/, '');
        const start = parse(leader.span.start);
        const fixedEnd = parse(leader.span.end);
        const openEnd = Number.isNaN(fixedEnd);
        const current = openEnd && start > Date.UTC(2024, 0, 1);
        const end = openEnd ? (current ? dataDate : start + 1029 * DAY) : fixedEnd;
        const tip = `${name}：${valueText(leader.start) || '？'} — ${valueText(leader.end) || '？'}｜${valueText(leader.role)}`;
        if (Number.isNaN(start)) {
          return `<div class="tenure-row"><span class="tenure-name">${escapeHtml(name)}</span><div class="tenure-track"><span class="tenure-unknown">任期不详</span></div></div>`;
        }
        const classes = ['tenure-bar', `branch-${escapeHtml(leader.span.branch)}`];
        if (openEnd && !current) classes.push('fade-end');
        if (leader.span.startOpen) classes.push('fade-start');
        return `<div class="tenure-row"><span class="tenure-name">${escapeHtml(name)}</span><div class="tenure-track">
          <button type="button" class="${classes.join(' ')}" style="left:${position(start)}%;width:${Math.max(1.2, position(end) - position(start))}%" data-tip="${escapeHtml(tip)}" aria-label="${escapeHtml(tip)}"></button>
          ${current ? `<span class="tenure-now" style="left:${position(start)}%">至今 →</span>` : ''}</div></div>`;
      }).join('')}</div>`;
  }

  function renderDomains() {
    const list = $('#domain-list');
    if (!list) return;
    if (!domains.length) { list.innerHTML = ''; return; }
    list.innerHTML = domains.map((item) => `<article class="organization-row domain-row">
      <span class="organization-date">${escapeHtml(valueText(item.date))}</span>
      <div><h4><code>${escapeHtml(valueText(item.host))}</code></h4><p>${escapeHtml(valueText(item.text))}</p>${sourceMarkup(item.sources, '')}</div>
    </article>`).join('');
  }

  function voiceMarkup(voice) {
    const source = Array.isArray(voice.sources) ? voice.sources[0] : null;
    const url = source ? safeUrl(source.url) : '';
    const title = source ? valueText(source.title) : '';
    return `<div class="voice-author"><b>${escapeHtml(valueText(voice.author))}</b><time>${escapeHtml(valueText(voice.date))}</time></div>
      <div class="voice-body"><blockquote>${escapeHtml(valueText(voice.text))}</blockquote>
        <p class="voice-context">${escapeHtml(valueText(voice.context))}</p>
        ${url ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">《${escapeHtml(title)}》${voice.floor ? ` · ${escapeHtml(voice.floor)} 楼` : ''}</a>` : ''}
      </div>`;
  }

  function renderVoices(era) {
    const list = $('#voice-list');
    if (!list) return;
    if (!voices.length) { $('#voices').hidden = true; return; }
    const shown = voices.filter((voice) => !era || eraFromYear(voice.year) === era);
    $('#voice-result').textContent = `${shown.length} / ${voices.length} 句`;
    let year = null;
    list.innerHTML = shown.map((voice) => {
      const head = voice.year !== year ? `<h3 class="voice-year">${escapeHtml(voice.year)}</h3>` : '';
      year = voice.year;
      return `${head}<article class="voice-floor">${voiceMarkup(voice)}</article>`;
    }).join('') || `<p class="steward-empty">这几年还没有收进来的句子。</p>`;
    $$('#voice-filters [data-voice-era]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.voiceEra === (era || ''))));
  }

  function renderVoiceDialog(index) {
    const voice = voices[index];
    if (!voice) return;
    openDialog(`<div class="dialog-content"><div class="dialog-meta"><span>${escapeHtml(valueText(voice.date))}</span><span>畔友原话</span></div>
      <h2 id="dialog-title">${escapeHtml(valueText(voice.author))} 说</h2>
      <div class="dialog-body voice-floor is-dialog">${voiceMarkup(voice)}</div></div>`);
  }

  function renderGlossary() {
    const list = $('#glossary-list');
    if (!list) return;
    list.innerHTML = glossary.map((item) => `<div class="glossary-item"><dt>${escapeHtml(valueText(item.term))}</dt><dd>${escapeHtml(valueText(item.text))}${sourceMarkup(item.sources, '')}</dd></div>`).join('');
  }

  function renderQuiz() {
    const list = $('#quiz-list');
    if (!list) return;
    if (!quiz.length) { list.hidden = true; return; }
    const state = { answered: 0, right: 0 };
    const letters = 'ABCD';
    const intro = $('#quiz-score').textContent;
    const reset = $('#quiz-reset');
    const draw = () => { list.innerHTML = quiz.map((item, index) => {
      const head = `<p class="quiz-from">${escapeHtml(valueText(item.from))} · 第 ${escapeHtml(item.number)} 题</p><h4>${escapeHtml(valueText(item.question))}</h4>`;
      const body = item.kind === 'fill'
        ? `<form class="quiz-fill" data-quiz-fill="${index}"><input type="text" aria-label="填写答案" autocomplete="off"><button type="submit">提交</button></form>`
        : `<div class="quiz-options">${item.options.map((option, choice) => `<button type="button" data-quiz="${index}" data-choice="${choice}"><b>${letters[choice]}</b>${escapeHtml(option)}</button>`).join('')}</div>`;
      return `<article class="quiz-item" id="quiz-${index}">${head}${body}<p class="quiz-result" aria-live="polite"></p></article>`;
    }).join(''); };
    draw();
    reset.addEventListener('click', () => {
      state.answered = 0;
      state.right = 0;
      draw();
      $('#quiz-score').textContent = intro;
      reset.hidden = true;
      $('#quiz').scrollIntoView({ block: 'start' });
    });

    function settle(index, correct, answerText) {
      const item = quiz[index];
      const card = $(`#quiz-${index}`);
      if (card.dataset.done) return;
      card.dataset.done = '1';
      state.answered += 1;
      if (correct) state.right += 1;
      const source = Array.isArray(item.sources) ? item.sources[0] : null;
      const url = source ? safeUrl(source.url) : '';
      $('.quiz-result', card).innerHTML = `<strong class="${correct ? 'is-right' : 'is-wrong'}">${correct ? '答对了。' : '答错了。'}</strong>标准答案：${escapeHtml(answerText)}。${escapeHtml(valueText(item.note))}${url ? ` <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">原帖答案</a>` : ''}`;
      $$('button, input', card).forEach((control) => { control.disabled = true; });
      $('#quiz-score').textContent = `答对 ${state.right} / 已答 ${state.answered} / 共 ${quiz.length} 题`;
      reset.hidden = false;
    }

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quiz]');
      if (!button) return;
      const index = Number(button.dataset.quiz);
      const item = quiz[index];
      const choice = Number(button.dataset.choice);
      const card = $(`#quiz-${index}`);
      $$('[data-quiz]', card).forEach((option) => {
        if (Number(option.dataset.choice) === item.answer) option.classList.add('is-answer');
      });
      if (choice !== item.answer) button.classList.add('is-picked-wrong');
      settle(index, choice === item.answer, `${letters[item.answer]}：${item.options[item.answer]}`);
    });
    list.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-quiz-fill]');
      if (!form) return;
      event.preventDefault();
      const index = Number(form.dataset.quizFill);
      const item = quiz[index];
      const given = $('input', form).value.replace(/\s+/g, '');
      if (!given) return;
      const accepted = Array.isArray(item.accept) ? item.accept : [item.answer];
      settle(index, accepted.includes(given), valueText(item.answer));
    });
  }

  function wireChartTips() {
    const tip = $('#chart-tip');
    if (!tip) return;
    const show = (target) => {
      tip.textContent = target.dataset.tip;
      tip.hidden = false;
      const box = target.getBoundingClientRect();
      const width = tip.offsetWidth;
      const left = Math.min(window.innerWidth - width - 8, Math.max(8, box.left + box.width / 2 - width / 2));
      const above = box.top - tip.offsetHeight - 8;
      tip.style.left = `${left}px`;
      tip.style.top = `${above > 4 ? above : box.bottom + 8}px`;
    };
    const hide = () => { tip.hidden = true; };
    ['pointerover', 'focusin'].forEach((type) => document.addEventListener(type, (event) => {
      const target = event.target.closest && event.target.closest('[data-tip]');
      if (target) show(target);
    }));
    ['pointerout', 'focusout'].forEach((type) => document.addEventListener(type, (event) => {
      if (event.target.closest && event.target.closest('[data-tip]')) hide();
    }));
    window.addEventListener('scroll', hide, { passive: true });
  }

  function wireVoices() {
    const filters = $('#voice-filters');
    if (!filters) return;
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-voice-era]');
      if (button) renderVoices(button.dataset.voiceEra);
    });
    renderVoices('');
  }

  renderOverview();
  renderStats();
  renderCelebration();
  renderNumbers();
  renderTenure();
  renderDomains();
  renderGlossary();
  renderQuiz();
  wireVoices();
  wireChartTips();
  renderLeaders();
  renderOrganization();
  renderRedesigns();
  renderAnniversaries();
  renderChapters();
  renderGaps();
  applyUpdatedDate();
  wireNavigation();
  wireTimeline();
  wireDialog();
  wireEraControls();
})();


