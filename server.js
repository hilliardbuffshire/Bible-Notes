/**
 * 말씀 노트 - Backend API Server
 * 실행: npm install && node server.js
 * API: http://localhost:3001
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");

// 한국어 성경 책명 → 번호 매핑
const KO_BOOKS = ['창세기','출애굽기','레위기','민수기','신명기','여호수아','사사기','룻기','사무엘상','사무엘하','열왕기상','열왕기하','역대상','역대하','에스라','느헤미야','에스더','욥기','시편','잠언','전도서','아가','이사야','예레미야','예레미야애가','에스겔','다니엘','호세아','요엘','아모스','오바댜','요나','미가','나훔','하박국','스바냐','학개','스가랴','말라기','마태복음','마가복음','누가복음','요한복음','사도행전','로마서','고린도전서','고린도후서','갈라디아서','에베소서','빌립보서','골로새서','데살로니가전서','데살로니가후서','디모데전서','디모데후서','디도서','빌레몬서','히브리서','야고보서','베드로전서','베드로후서','요한일서','요한이서','요한삼서','유다서','요한계시록'];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,*/*'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', reject);
  });
}

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "notes-data.json");

// ── Supabase 설정 (환경변수) ──
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// 정적 파일 서빙 — index.html을 / 에서 직접 서빙
app.use(express.static(path.join(__dirname)));

// ──────────────────────────────────────────────
// Supabase REST API 헬퍼
// ──────────────────────────────────────────────

function supabaseFetch(endpoint, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (method === 'POST') headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(
      { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ──────────────────────────────────────────────
// 데이터 헬퍼 (Supabase 우선, 없으면 JSON 파일)
// ──────────────────────────────────────────────

async function loadData() {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const { status, body } = await supabaseFetch('/rest/v1/app_data?id=eq.1&select=*', 'GET', null);
      if (status === 200) {
        const rows = JSON.parse(body);
        if (rows.length > 0) return { notes: rows[0].notes || [], settings: rows[0].settings || {} };
      }
      // 최초 1회: 초기 데이터 삽입
      const initial = { notes: getInitialNotes() };
      await supabaseFetch('/rest/v1/app_data', 'POST', { id: 1, notes: initial.notes, settings: {} });
      return initial;
    } catch (e) { console.error('[SUPABASE loadData]', e.message); }
  }
  // 로컬 JSON 파일 폴백
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { notes: getInitialNotes() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return { notes: [] }; }
}

async function saveData(data) {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await supabaseFetch('/rest/v1/app_data', 'POST', { id: 1, notes: data.notes || [], settings: data.settings || {} });
      return;
    } catch (e) { console.error('[SUPABASE saveData]', e.message); }
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getInitialNotes() {
  return [
    {
      id: "note_initial_1",
      title: "하나님의 크신 사랑",
      date: "2026-04-05",
      church: "은혜제일교회",
      mainScripture: "요한복음 3:16-17",
      content: `오늘 설교에서 하나님의 사랑의 깊이를 묵상했습니다.\n\n▶ 핵심 메시지\n하나님의 사랑은 조건 없는 선재적(先在的) 사랑입니다. 우리가 먼저 하나님을 사랑한 것이 아니라, 하나님이 먼저 우리를 사랑하셨습니다 (요일 4:19).\n\n▶ 주요 포인트\n1. 독생자를 주실 만큼 크신 사랑 (요 3:16)\n2. 심판이 아닌 구원을 위해 보내신 아들 (요 3:17)\n3. 믿는 자에게 주시는 영생의 약속\n\n▶ 적용\n이 사랑을 받은 자로서, 이웃을 사랑하는 삶을 살겠습니다.`,
      summary: "하나님의 무조건적 사랑(요 3:16)을 통해 복음의 핵심을 묵상. 믿음으로 영생을 얻고, 그 사랑을 이웃에게 나누는 삶을 결단.",
      tags: ["사랑", "구원", "요한복음", "영생"],
      verses: [
        {
          id: "v1",
          korReference: "요한복음 3:16",
          enReference: "John 3:16",
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          translation: "KJV",
          korText: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라"
        }
      ],
      comments: [
        { id: "c1", author: "이은혜", text: "정말 은혜로운 설교 요약이에요. 나눠주셔서 감사합니다!", timestamp: "2026-04-05T14:30:00.000Z", likes: 4 },
        { id: "c2", author: "박성실", text: "적용 부분이 특히 좋았어요. 저도 이웃 사랑 실천해볼게요!", timestamp: "2026-04-05T16:15:00.000Z", likes: 2 }
      ],
      isPublic: true,
      views: 31,
      likes: 9,
      createdAt: "2026-04-05T09:00:00.000Z"
    },
    {
      id: "note_initial_2",
      title: "믿음으로 사는 삶",
      date: "2026-03-29",
      church: "생명수교회",
      mainScripture: "히브리서 11:1-6",
      content: `히브리서 11장(믿음장)을 통해 믿음의 선진들을 살펴보았습니다.\n\n▶ 믿음의 정의\n"믿음은 바라는 것들의 실상이요 보이지 않는 것들의 증거니" (히 11:1)\n\n▶ 믿음의 영웅들\n- 아벨: 더 나은 제사를 드림\n- 에녹: 하나님과 동행\n- 노아: 방주를 준비함\n- 아브라함: 보이지 않는 약속을 믿고 고향을 떠남\n\n▶ 적용\n보이지 않아도 믿는 믿음으로, 오늘도 한 걸음씩 나아가겠습니다.`,
      summary: "히브리서 11장(믿음장)을 통한 믿음의 정의와 믿음의 선진들. 보이지 않는 것을 믿는 믿음으로 하나님께 나아가는 도전.",
      tags: ["믿음", "히브리서", "삶의 적용"],
      verses: [
        {
          id: "v2",
          korReference: "히브리서 11:1",
          enReference: "Hebrews 11:1",
          text: "Now faith is the substance of things hoped for, the evidence of things not seen.",
          translation: "KJV",
          korText: "믿음은 바라는 것들의 실상이요 보이지 않는 것들의 증거니"
        }
      ],
      comments: [],
      isPublic: true,
      views: 18,
      likes: 6,
      createdAt: "2026-03-29T09:00:00.000Z"
    }
  ];
}

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────

// GET /api/notes  — 전체 노트 목록
app.get("/api/notes", async (req, res) => {
  const { notes } = await loadData();
  res.json(notes);
});

// GET /api/notes/:id  — 단일 노트 (조회수 +1)
app.get("/api/notes/:id", async (req, res) => {
  const data = await loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  note.views = (note.views || 0) + 1;
  await saveData(data);
  res.json(note);
});

// POST /api/notes  — 노트 생성
app.post("/api/notes", async (req, res) => {
  const data = await loadData();
  const newNote = {
    ...req.body,
    id: uid(),
    views: 0,
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.notes.unshift(newNote);
  await saveData(data);
  console.log(`[CREATE] "${newNote.title}"`);
  res.status(201).json(newNote);
});

// PUT /api/notes/:id  — 노트 수정
app.put("/api/notes/:id", async (req, res) => {
  const data = await loadData();
  const idx = data.notes.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  data.notes[idx] = {
    ...data.notes[idx],
    ...req.body,
    id: req.params.id,
    comments: data.notes[idx].comments,
    views: data.notes[idx].views,
    likes: data.notes[idx].likes,
    updatedAt: new Date().toISOString(),
  };
  await saveData(data);
  console.log(`[UPDATE] "${data.notes[idx].title}"`);
  res.json(data.notes[idx]);
});

// DELETE /api/notes/:id  — 노트 삭제
app.delete("/api/notes/:id", async (req, res) => {
  const data = await loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  data.notes = data.notes.filter((n) => n.id !== req.params.id);
  await saveData(data);
  console.log(`[DELETE] "${note.title}"`);
  res.json({ success: true });
});

// POST /api/notes/:id/like  — 좋아요
app.post("/api/notes/:id/like", async (req, res) => {
  const data = await loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  note.likes = (note.likes || 0) + 1;
  await saveData(data);
  res.json({ likes: note.likes });
});

// POST /api/notes/:id/comments  — 댓글 추가
app.post("/api/notes/:id/comments", async (req, res) => {
  const data = await loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  const comment = {
    ...req.body,
    id: uid(),
    timestamp: new Date().toISOString(),
    likes: 0,
  };
  note.comments = [...(note.comments || []), comment];
  await saveData(data);
  console.log(`[COMMENT] on "${note.title}" by ${comment.author}`);
  res.status(201).json(comment);
});

// DELETE /api/notes/:noteId/comments/:commentId  — 댓글 삭제
app.delete("/api/notes/:noteId/comments/:commentId", async (req, res) => {
  const data = await loadData();
  const note = data.notes.find((n) => n.id === req.params.noteId);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  note.comments = note.comments.filter((c) => c.id !== req.params.commentId);
  await saveData(data);
  res.json({ success: true });
});

// POST /api/ai/summarize  — Groq AI 핵심 요약
app.post("/api/ai/summarize", async (req, res) => {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(503).json({ error: 'GROQ_API_KEY 환경변수가 설정되지 않았습니다. Render 대시보드 → Environment 에서 추가해주세요.' });
  const { content, title, mainScripture } = req.body;
  if (!content && !title) return res.status(400).json({ error: '요약할 내용이 없습니다.' });
  const prompt = `다음 성경 설교/묵상 노트의 핵심 내용을 2~3문장으로 간결하게 한국어로 요약해주세요. 요약 문장만 작성하고, 다른 설명이나 제목은 붙이지 마세요.\n\n제목: ${title||''}\n본문: ${mainScripture||''}\n\n내용:\n${content||''}`;
  const reqBody = JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.5 });
  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request({
        hostname: 'api.groq.com', port: 443, path: '/openai/v1/chat/completions', method: 'POST',
        headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) }
      }, (response) => {
        const chunks = [];
        response.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      });
      request.on('error', reject);
      request.write(reqBody);
      request.end();
    });
    if (result.status !== 200) { console.error('[GROQ]', result.body); return res.status(500).json({ error: 'Groq API 오류 — API 키를 확인해주세요.' }); }
    const data = JSON.parse(result.body);
    const summary = (data.choices?.[0]?.message?.content || '').trim();
    if (!summary) return res.status(500).json({ error: '요약 생성에 실패했습니다.' });
    res.json({ summary });
  } catch (e) { console.error('[GROQ]', e); res.status(500).json({ error: e.message }); }
});

// ── 한국어 성경 (GitHub CDN 캐시 방식) ──
const EN_SRV=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];

// 한국어 성경 — 로컬 파일 우선, 없으면 CDN 다운로드 후 저장
let KO_DB = null;
const KO_FILE = path.join(__dirname, 'ko-bible.json');
(async () => {
  // 1. 로컬 파일 (ko-bible.json)
  if (fs.existsSync(KO_FILE)) {
    try {
      KO_DB = JSON.parse(fs.readFileSync(KO_FILE, 'utf8'));
      console.log('✅ 한국어 성경 로컬 파일 로드 완료');
      return;
    } catch {}
  }
  // 2. CDN 다운로드 후 로컬 저장
  const CDN = 'https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/ko_ko.json';
  try {
    const { status, body } = await fetchUrl(CDN);
    if (status === 200) {
      const d = JSON.parse(body);
      if (Array.isArray(d) && d.length >= 66) {
        KO_DB = d;
        try { fs.writeFileSync(KO_FILE, body, 'utf8'); } catch {}
        console.log('✅ 한국어 성경 CDN 로드 및 저장 완료');
        return;
      }
    }
  } catch {}
  console.log('⚠️ 한국어 성경 로드 실패');
})();

function lookupKo(bookIdx, ch, vs) {
  if (!KO_DB || !KO_DB[bookIdx]) return '';
  const chapters = KO_DB[bookIdx].chapters || KO_DB[bookIdx];
  if (!Array.isArray(chapters)) return '';
  const chArr = chapters[ch - 1];
  if (!Array.isArray(chArr)) return '';
  return (chArr[vs - 1] || '').toString().trim();
}

app.get("/api/bible/ko", async (req, res) => {
  const ref = (req.query.ref || '').trim();
  let idx = -1, matchLen = 0;
  for (let i = 0; i < KO_BOOKS.length; i++) {
    if (ref.startsWith(KO_BOOKS[i])) { idx = i; matchLen = KO_BOOKS[i].length; break; }
  }
  if (idx === -1) {
    for (let i = 0; i < EN_SRV.length; i++) {
      if (ref.toLowerCase().startsWith(EN_SRV[i].toLowerCase())) { idx = i; matchLen = EN_SRV[i].length; break; }
    }
  }
  if (idx === -1) return res.json({ text: '' });
  const rest = ref.slice(matchLen).trim();
  const m = rest.match(/(\d+):(\d+)/);
  if (!m) return res.json({ text: '' });

  // 1차: 메모리 캐시 (개역개정 JSON)
  const cached = lookupKo(idx, parseInt(m[1]), parseInt(m[2]));
  if (cached && cached.length > 2) return res.json({ text: cached });

  // 2차: getbible.net (오류 응답 필터링)
  try {
    const { status, body } = await fetchUrl(`https://getbible.net/v2/korean/${idx+1}/${m[1]}.json`);
    if (status === 200 && body.includes('"verses"') && !body.includes('Access denied')) {
      const d = JSON.parse(body);
      const text = (d.verses?.[String(parseInt(m[2]))]?.verse || '').trim();
      if (text) return res.json({ text });
    }
  } catch {}

  res.json({ text: '' });
});

// 설정 API
app.get("/api/settings", async (req, res) => {
  const data = await loadData();
  res.json(data.settings || { defaultChurch: '부산제일교회' });
});
app.put("/api/settings", async (req, res) => {
  const data = await loadData();
  data.settings = { ...(data.settings || {}), ...req.body };
  await saveData(data);
  res.json(data.settings);
});

// 헬스체크
app.get("/api/health", async (req, res) => {
  const { notes } = await loadData();
  const storage = SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'local-json';
  res.json({ status: "ok", notes: notes.length, storage, time: new Date().toISOString() });
});

// Excel 내보내기
app.get("/api/export/excel", async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const { notes } = await loadData();
    const wb = new ExcelJS.Workbook();
    wb.creator = "말씀 노트 플랫폼";

    const C = { BROWN:"7B4B2A", BLIGHT:"A0632F", AMBER:"C8780A", AMBLIGHT:"FFF3C7",
                CREAM:"FDF6EE", CREAMD:"FFF3E0", WHITE:"FFFFFF", ROWALT:"FFF8F0", BORDER:"E2CDB8" };
    const F  = (sz,bold,color)=>({name:"Malgun Gothic",size:sz,bold:!!bold,color:{argb:color||"3A1E08"}});
    const FL = c=>({type:"pattern",pattern:"solid",fgColor:{argb:c}});
    const BA = c=>({top:{style:"thin",color:{argb:c}},bottom:{style:"thin",color:{argb:c}},left:{style:"thin",color:{argb:c}},right:{style:"thin",color:{argb:c}}});
    const BB = c=>({bottom:{style:"thin",color:{argb:c}}});
    const AL = (h,v,wrap)=>({horizontal:h||"left",vertical:v||"top",wrapText:!!wrap});

    // 내용 길이 기반 행 높이 동적 계산
    function calcH(cells, widths, min=45) {
      let lines=0;
      cells.forEach((txt,i)=>{
        const s=String(txt||"");
        const nl=s.split("\n").length;
        const wrap=Math.ceil(s.length/Math.max(widths[i]*1.8,1));
        lines=Math.max(lines,nl+wrap-1);
      });
      return Math.max(min, Math.min(lines*17, 420));
    }
    function getBook(ref){
      const m=ref.match(/^(\d+\s+[\uAC00-\uD7A3a-zA-Z]+|[\uAC00-\uD7A3a-zA-Z]+)/);
      return m?m[1].trim():ref.split(" ")[0];
    }

    // ── Sheet 1: 말씀 노트 목록 ──
    const ws1=wb.addWorksheet("말씀 노트 목록",{views:[{state:"frozen",ySplit:3}]});
    // 열 너비: 번호, 제목, 날짜, 교회, 본문구절, 요약, 내용, 태그, YouTube
    const W1=[5,30,13,20,28,55,78,22,42];
    const H1=["번호","제목","날짜","교회","본문 성경구절","핵심 요약","노트 내용","태그","YouTube 링크"];
    W1.forEach((w,i)=>{ ws1.getColumn(i+1).width=w; });

    ws1.mergeCells("A1:I1");
    Object.assign(ws1.getCell("A1"),{value:"📖 말씀 노트 플랫폼",font:F(17,true,"FFFFFF"),fill:FL(C.BROWN),alignment:AL("center","middle")});
    ws1.getRow(1).height=42;
    ws1.mergeCells("A2:I2");
    Object.assign(ws1.getCell("A2"),{value:`내보내기: ${new Date().toLocaleDateString("ko-KR")}  |  총 노트 ${notes.length}개`,font:F(9,false,C.BROWN),fill:FL(C.CREAMD),alignment:AL("right","middle")});
    ws1.getRow(2).height=22;
    const hr1=ws1.getRow(3);
    H1.forEach((h,i)=>{
      const c=hr1.getCell(i+1);
      Object.assign(c,{value:h,font:F(11,true,"FFFFFF"),fill:FL(C.AMBER),alignment:AL("center","middle",true),border:BB(C.BROWN)});
    });
    hr1.height=28;
    ws1.autoFilter={from:{row:3,column:1},to:{row:3,column:9}};

    notes.forEach((n,idx)=>{
      const scr=(n.mainScripture||"").split("\n").filter(Boolean).join(" · ");
      const cells=[idx+1,n.title||"",n.date||"",n.church||"",scr,n.summary||"",n.content||"",(n.tags||[]).join(", "),n.youtubeUrl||""];
      const r=ws1.getRow(idx+4);
      const bg=idx%2===0?C.WHITE:C.ROWALT;
      cells.forEach((v,i)=>{
        const c=r.getCell(i+1);
        c.value=v; c.fill=FL(bg); c.alignment=AL(i===0?"center":"left","top",true); c.border=BB(C.BORDER);
        c.font=i===1?F(10,true):F(10);
      });
      r.height=calcH(cells,W1,50);
    });

    // ── Sheet 2: 인용 성경 구절 ──
    const ws2=wb.addWorksheet("인용 성경 구절",{views:[{state:"frozen",ySplit:3}]});
    // 열 너비: 성경책, 구절참조, 영어본문, 한국어본문, 노트제목, 날짜
    const W2=[16,22,68,62,30,13];
    const H2=["성경책","구절 참조","영어 본문","한국어 본문","노트 제목","날짜"];
    W2.forEach((w,i)=>{ ws2.getColumn(i+1).width=w; });

    ws2.mergeCells("A1:F1");
    Object.assign(ws2.getCell("A1"),{value:"📜 인용 성경 구절 목록",font:F(15,true,"FFFFFF"),fill:FL(C.BROWN),alignment:AL("center","middle")});
    ws2.getRow(1).height=40;
    const allV=notes.reduce((a,n)=>a+(n.verses||[]).length,0);
    ws2.mergeCells("A2:F2");
    Object.assign(ws2.getCell("A2"),{value:`총 ${allV}개  |  성경책 열(A)의 ▼ 버튼으로 성경책별 필터링 가능`,font:F(9,false,C.BROWN),fill:FL(C.CREAMD),alignment:AL("right","middle")});
    ws2.getRow(2).height=22;
    const hr2=ws2.getRow(3);
    H2.forEach((h,i)=>{
      const c=hr2.getCell(i+1);
      Object.assign(c,{value:h,font:F(11,true,"FFFFFF"),fill:FL(C.BROWN),alignment:AL("center","middle",true),border:BA(C.AMBER)});
    });
    ws2.getRow(3).height=28;
    ws2.autoFilter={from:{row:3,column:1},to:{row:3,column:6}};

    let vr=4;
    notes.forEach(n=>{
      (n.verses||[]).forEach(v=>{
        const ref=v.ref||v.enReference||"";
        const en=v.text||""; const ko=v.koText||v.korText||"";
        const cells=[getBook(ref),ref,en,ko,n.title||"",n.date||""];
        const row=ws2.getRow(vr);
        const bg=(vr-4)%2===0?C.WHITE:C.AMBLIGHT;
        cells.forEach((val,i)=>{
          const c=row.getCell(i+1);
          c.value=val; c.fill=FL(bg); c.alignment=AL("left","top",true); c.border=BA(C.BORDER);
          c.font=i<2?F(10,true,C.BLIGHT):F(10);
        });
        row.height=calcH(cells,W2,55);
        vr++;
      });
    });

    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent("말씀노트.xlsx")}`);
    await wb.xlsx.write(res); res.end();
  } catch(e) {
    console.error("[EXCEL]",e);
    res.status(500).json({error:e.message});
  }
});

// ──────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📖  말씀 노트 API 서버 시작`);
  console.log(`🌐  http://localhost:${PORT}`);
  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log(`☁️   저장소: Supabase (영구 보존)`);
  } else {
    console.log(`💾  저장소: 로컬 JSON (${DATA_FILE})`);
    console.log(`⚠️   Render 배포 시 SUPABASE_URL, SUPABASE_KEY 환경변수를 설정하세요!`);
  }
  if (process.env.GROQ_API_KEY) {
    console.log(`✨  Groq AI 요약: 활성화`);
  } else {
    console.log(`💡  Groq AI 요약: 비활성화 (GROQ_API_KEY 환경변수 필요)`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});
