/**
 * 말씀 노트 - Backend API Server
 * 실행: npm install && node server.js
 * API: http://localhost:3001
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "notes-data.json");

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// 정적 파일 서빙 — index.html을 / 에서 직접 서빙
app.use(express.static(path.join(__dirname)));

// ──────────────────────────────────────────────
// 데이터 헬퍼 (JSON 파일 기반)
// ──────────────────────────────────────────────

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { notes: getInitialNotes() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { notes: [] };
  }
}

function saveData(data) {
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
app.get("/api/notes", (req, res) => {
  const { notes } = loadData();
  res.json(notes);
});

// GET /api/notes/:id  — 단일 노트 (조회수 +1)
app.get("/api/notes/:id", (req, res) => {
  const data = loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  note.views = (note.views || 0) + 1;
  saveData(data);
  res.json(note);
});

// POST /api/notes  — 노트 생성
app.post("/api/notes", (req, res) => {
  const data = loadData();
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
  saveData(data);
  console.log(`[CREATE] "${newNote.title}"`);
  res.status(201).json(newNote);
});

// PUT /api/notes/:id  — 노트 수정
app.put("/api/notes/:id", (req, res) => {
  const data = loadData();
  const idx = data.notes.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  data.notes[idx] = {
    ...data.notes[idx],
    ...req.body,
    id: req.params.id, // id 보존
    comments: data.notes[idx].comments, // 댓글 보존
    views: data.notes[idx].views,
    likes: data.notes[idx].likes,
    updatedAt: new Date().toISOString(),
  };
  saveData(data);
  console.log(`[UPDATE] "${data.notes[idx].title}"`);
  res.json(data.notes[idx]);
});

// DELETE /api/notes/:id  — 노트 삭제
app.delete("/api/notes/:id", (req, res) => {
  const data = loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  data.notes = data.notes.filter((n) => n.id !== req.params.id);
  saveData(data);
  console.log(`[DELETE] "${note.title}"`);
  res.json({ success: true });
});

// POST /api/notes/:id/like  — 좋아요
app.post("/api/notes/:id/like", (req, res) => {
  const data = loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  note.likes = (note.likes || 0) + 1;
  saveData(data);
  res.json({ likes: note.likes });
});

// POST /api/notes/:id/comments  — 댓글 추가
app.post("/api/notes/:id/comments", (req, res) => {
  const data = loadData();
  const note = data.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  const comment = {
    ...req.body,
    id: uid(),
    timestamp: new Date().toISOString(),
    likes: 0,
  };
  note.comments = [...(note.comments || []), comment];
  saveData(data);
  console.log(`[COMMENT] on "${note.title}" by ${comment.author}`);
  res.status(201).json(comment);
});

// DELETE /api/notes/:noteId/comments/:commentId  — 댓글 삭제
app.delete("/api/notes/:noteId/comments/:commentId", (req, res) => {
  const data = loadData();
  const note = data.notes.find((n) => n.id === req.params.noteId);
  if (!note) return res.status(404).json({ error: "노트를 찾을 수 없습니다." });
  note.comments = note.comments.filter((c) => c.id !== req.params.commentId);
  saveData(data);
  res.json({ success: true });
});

// 헬스체크
app.get("/api/health", (req, res) => {
  const { notes } = loadData();
  res.json({ status: "ok", notes: notes.length, time: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📖  말씀 노트 API 서버 시작`);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`💾  데이터: ${DATA_FILE}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});
