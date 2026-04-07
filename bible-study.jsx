import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Plus, Search, Heart, MessageCircle, Eye, X, Send,
  Edit2, Share2, Copy, Check, Calendar, Hash, Quote, Home,
  ArrowLeft, Trash2, RefreshCw, WifiOff, Loader
} from "lucide-react";

// ──────────────────────────────────────────────────────────
// 1. 설정
// ──────────────────────────────────────────────────────────

const API_BASE = "http://localhost:3001";

const KO_BOOKS = [
  "창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기",
  "사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야",
  "에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가",
  "에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔",
  "하박국","스바냐","학개","스가랴","말라기",
  "마태복음","마가복음","누가복음","요한복음","사도행전","로마서",
  "고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서",
  "데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서",
  "히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서",
  "유다서","요한계시록"
];
const EN_BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah",
  "Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
  "Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum",
  "Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans",
  "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];
const KO_TO_EN = Object.fromEntries(KO_BOOKS.map((k, i) => [k, EN_BOOKS[i]]));

const TRANSLATIONS = [
  { id: "kjv", label: "KJV – King James Version" },
  { id: "web", label: "WEB – World English Bible" },
  { id: "bbe", label: "BBE – Basic Bible English" },
  { id: "webbe", label: "WEBBE – World English Bible (British)" },
];

const QUICK_REFS = [
  "John 3:16", "Psalms 23:1", "Jeremiah 29:11",
  "Romans 8:28", "Philippians 4:13", "Matthew 28:19",
  "Isaiah 40:31", "Proverbs 3:5-6"
];

// ──────────────────────────────────────────────────────────
// 2. API 클라이언트
// ──────────────────────────────────────────────────────────

async function apiFetch(method, endpoint, body) {
  const res = await fetch(API_BASE + endpoint, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  getNotes: () => apiFetch("GET", "/api/notes"),
  createNote: (note) => apiFetch("POST", "/api/notes", note),
  updateNote: (id, note) => apiFetch("PUT", `/api/notes/${id}`, note),
  deleteNote: (id) => apiFetch("DELETE", `/api/notes/${id}`),
  likeNote: (id) => apiFetch("POST", `/api/notes/${id}/like`),
  addComment: (noteId, comment) => apiFetch("POST", `/api/notes/${noteId}/comments`, comment),
  deleteComment: (noteId, commentId) => apiFetch("DELETE", `/api/notes/${noteId}/comments/${commentId}`),
  health: () => apiFetch("GET", "/api/health"),
};

// ──────────────────────────────────────────────────────────
// 3. 유틸
// ──────────────────────────────────────────────────────────

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function formatDate(s) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function formatTs(s) {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function parseKorRef(ref) {
  const trimmed = ref.trim();
  for (const ko of KO_BOOKS) {
    if (trimmed.startsWith(ko)) {
      const rest = trimmed.slice(ko.length).trim();
      return KO_TO_EN[ko] + " " + rest;
    }
  }
  return trimmed;
}

// ──────────────────────────────────────────────────────────
// 4. 서버 연결 오류 배너
// ──────────────────────────────────────────────────────────

function ServerErrorBanner({ onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
      <WifiOff size={20} className="text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-red-700 text-sm mb-1">서버에 연결할 수 없습니다</p>
        <p className="text-xs text-red-500 leading-relaxed mb-3">
          백엔드 서버가 실행 중인지 확인해주세요.<br />
          <code className="bg-red-100 px-1 rounded">cd bible-notes && npm install && node server.js</code>
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200 transition-colors"
        >
          <RefreshCw size={12} /> 다시 시도
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 5. VerseCard
// ──────────────────────────────────────────────────────────

function VerseCard({ verse, onDelete }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const txt = verse.korText
      ? `"${verse.korText}" — ${verse.korReference}`
      : `"${verse.text}" — ${verse.enReference} (${verse.translation})`;
    navigator.clipboard?.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ borderLeft: "4px solid #d97706" }} className="bg-amber-50 rounded-r-xl px-4 py-3 my-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1 flex-wrap">
            {verse.korReference && <span>{verse.korReference}</span>}
            {verse.enReference && verse.korReference && <span className="text-amber-400 mx-0.5">·</span>}
            {verse.enReference && <span className="text-amber-600">{verse.enReference}</span>}
            <span className="ml-1 bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded text-xs font-normal">
              {verse.translation}
            </span>
          </p>
          {verse.korText && (
            <p className="text-gray-800 text-sm leading-relaxed mb-1">"{verse.korText}"</p>
          )}
          {verse.text && (
            <p className={`text-gray-500 leading-relaxed italic ${verse.korText ? "text-xs mt-1" : "text-sm"}`}>
              "{verse.text}"
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={handleCopy} className="text-amber-400 hover:text-amber-700 p-1 rounded">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {onDelete && (
            <button onClick={onDelete} className="text-red-300 hover:text-red-500 p-1 rounded">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 6. BiblePanel (성경 구절 검색)
// ──────────────────────────────────────────────────────────

function BiblePanel({ onClose, onInsert }) {
  const [mode, setMode] = useState("api");
  const [ref, setRef] = useState("");
  const [translation, setTranslation] = useState("kjv");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [korText, setKorText] = useState("");
  const [korRef, setKorRef] = useState("");
  const [manualKorText, setManualKorText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async () => {
    if (!ref.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const enRef = parseKorRef(ref);
      const url = `https://bible-api.com/${encodeURIComponent(enRef)}?translation=${translation}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setError("구절을 찾을 수 없습니다. 영어로 입력해 보세요. (예: John 3:16)");
    } finally {
      setLoading(false);
    }
  };

  const handleInsertApi = () => {
    if (!result) return;
    const verseText = result.verses
      ? result.verses.map(v => v.text.trim()).join(" ")
      : (result.text || "").trim();
    onInsert({
      id: uid(),
      enReference: result.reference,
      korReference: korRef || ref,
      text: verseText,
      translation: translation.toUpperCase(),
      korText: korText.trim()
    });
    onClose();
  };

  const handleInsertManual = () => {
    if (!korRef.trim() || !manualKorText.trim()) return;
    onInsert({
      id: uid(),
      enReference: "",
      korReference: korRef,
      text: "",
      translation: "개역개정",
      korText: manualKorText.trim()
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white h-full w-full max-w-sm shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={20} />
            <span className="font-bold text-lg">성경 구절 검색</span>
          </div>
          <button onClick={onClose} className="text-amber-200 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex border-b border-amber-100 shrink-0">
          <button
            onClick={() => setMode("api")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "api" ? "text-amber-800 border-b-2 border-amber-700 bg-amber-50" : "text-gray-500 hover:text-amber-700"}`}
          >
            🌐 영어 성경 API
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "manual" ? "text-amber-800 border-b-2 border-amber-700 bg-amber-50" : "text-gray-500 hover:text-amber-700"}`}
          >
            ✍️ 한국어 직접 입력
          </button>
        </div>

        <div className="p-5 flex-1">
          {mode === "api" && (
            <>
              <p className="text-xs text-gray-500 mb-3">
                영어 또는 한국어로 구절 주소를 입력하세요.<br />
                예) <code className="bg-gray-100 px-1 rounded">John 3:16</code> · <code className="bg-gray-100 px-1 rounded">요한복음 3:16</code>
              </p>
              <input
                ref={inputRef}
                value={ref}
                onChange={e => setRef(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="John 3:16 또는 요한복음 3:16"
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <select
                value={translation}
                onChange={e => setTranslation(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm mb-3"
              >
                {TRANSLATIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button
                onClick={handleSearch}
                disabled={loading || !ref.trim()}
                className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader size={14} className="animate-spin" /> 검색 중…</> : "검색하기"}
              </button>

              {error && <p className="text-red-500 text-xs mt-2 bg-red-50 px-3 py-2 rounded">{error}</p>}

              {result && (
                <div className="mt-4 space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-800 mb-2">{result.reference}</p>
                    <p className="text-gray-700 text-sm leading-relaxed italic">
                      "{result.verses ? result.verses.map(v => v.text.trim()).join(" ") : result.text}"
                    </p>
                    <p className="text-right text-xs text-amber-500 mt-2">— {translation.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">한국어 구절 주소 (선택)</label>
                    <input
                      value={korRef}
                      onChange={e => setKorRef(e.target.value)}
                      placeholder="요한복음 3:16"
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">한국어 번역 추가 (선택)</label>
                    <textarea
                      value={korText}
                      onChange={e => setKorText(e.target.value)}
                      placeholder="개역개정 등 한국어 번역을 붙여넣으세요..."
                      rows={3}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={handleInsertApi}
                    className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-700 transition-colors"
                  >
                    ✅ 노트에 인용하기
                  </button>
                </div>
              )}

              <div className="mt-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">자주 인용되는 구절</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REFS.map(v => (
                    <button
                      key={v}
                      onClick={() => { setRef(v); setMode("api"); }}
                      className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-200 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "manual" && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                한국어 성경(개역개정, 새번역 등)을 직접 입력하여 노트에 추가합니다.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">구절 주소 *</label>
                  <input
                    value={korRef}
                    onChange={e => setKorRef(e.target.value)}
                    placeholder="요한복음 3:16"
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">구절 내용 *</label>
                  <textarea
                    value={manualKorText}
                    onChange={e => setManualKorText(e.target.value)}
                    placeholder="성경 구절 내용을 붙여넣으세요..."
                    rows={5}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <button
                  onClick={handleInsertManual}
                  disabled={!korRef.trim() || !manualKorText.trim()}
                  className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-800 disabled:opacity-50 transition-colors"
                >
                  ✅ 노트에 인용하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 7. NoteCard
// ──────────────────────────────────────────────────────────

function NoteCard({ note, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-amber-100 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer p-5 group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-amber-800 transition-colors pr-2">
          {note.title}
        </h3>
        {note.isPublic && (
          <span className="shrink-0 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">공개</span>
        )}
      </div>

      <p className="text-xs text-amber-700 font-semibold mb-2 flex items-center gap-1">
        <BookOpen size={12} /> {note.mainScripture}
        {note.church && <span className="text-gray-400 font-normal ml-1">· {note.church}</span>}
      </p>

      <p
        className="text-sm text-gray-600 mb-3 leading-relaxed"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {note.summary}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(note.tags || []).slice(0, 4).map(tag => (
          <span key={tag} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">#{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(note.date)}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Eye size={11} /> {note.views}</span>
          <span className="flex items-center gap-1"><Heart size={11} /> {note.likes}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> {(note.comments || []).length}</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 8. NoteDetail
// ──────────────────────────────────────────────────────────

function NoteDetail({ note, onBack, onEdit, onDelete, onLike, onAddComment, onDeleteComment, saving }) {
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [toast, setToast] = useState("");
  const [likedLocal, setLikedLocal] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleShare = () => {
    const txt = `📖 ${note.title}\n\n${note.summary}\n\n본문: ${note.mainScripture}${note.church ? `\n교회: ${note.church}` : ""}`;
    navigator.clipboard?.writeText(txt);
    showToast("클립보드에 복사되었습니다!");
  };

  const handleLike = async () => {
    if (likedLocal) return;
    setLikedLocal(true);
    await onLike(note.id);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !commentAuthor.trim()) return;
    setSendingComment(true);
    try {
      await onAddComment(note.id, { author: commentAuthor, text: commentText });
      setCommentText("");
      showToast("댓글이 등록되었습니다!");
    } catch {
      showToast("댓글 등록에 실패했습니다.");
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-amber-700 hover:text-amber-900 text-sm font-medium">
          <ArrowLeft size={15} /> 목록으로
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-2 rounded-lg text-gray-400 hover:text-amber-700 hover:bg-amber-50 transition-colors">
            <Edit2 size={17} />
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={17} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-500 font-semibold">삭제할까요?</span>
              <button onClick={() => onDelete(note.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold hover:bg-red-600">예</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-bold hover:bg-gray-300">취소</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-3">{note.title}</h1>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
          {note.church && <span>🏛️ {note.church}</span>}
          <span className="flex items-center gap-1"><Calendar size={13} className="text-amber-500" /> {formatDate(note.date)}</span>
        </div>

        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 px-4 py-2 rounded-xl text-sm font-semibold mb-5">
          <BookOpen size={16} /> {note.mainScripture}
        </div>

        {note.summary && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-5">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">📝 요약</p>
            <p className="text-gray-700 text-sm leading-relaxed">{note.summary}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {(note.tags || []).map(tag => (
            <span key={tag} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full">#{tag}</span>
          ))}
        </div>

        <hr className="border-amber-100 mb-5" />

        <div className="text-gray-700 text-sm leading-8 whitespace-pre-wrap font-sans">{note.content}</div>

        {(note.verses || []).length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-2">
              <Quote size={16} /> 인용 성경 구절 ({note.verses.length}개)
            </p>
            {note.verses.map(v => <VerseCard key={v.id} verse={v} />)}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-amber-100">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Eye size={12} /> {note.views}회 조회</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-gray-500 hover:text-amber-700 text-sm px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <Share2 size={14} /> 공유
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${likedLocal ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400"}`}
            >
              <Heart size={14} fill={likedLocal ? "currentColor" : "none"} /> {note.likes + (likedLocal ? 0 : 0)}
            </button>
          </div>
        </div>
      </div>

      {/* 댓글 */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
        <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
          <MessageCircle size={18} className="text-amber-600" />
          댓글 및 토론 ({(note.comments || []).length})
        </h3>

        {(note.comments || []).length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <MessageCircle size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">첫 번째 댓글을 남겨보세요!</p>
          </div>
        )}

        <div className="space-y-4 mb-5">
          {(note.comments || []).map(c => (
            <div key={c.id} className="flex gap-3 group/comment">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {c.author[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-800">{c.author}</span>
                  <span className="text-xs text-gray-400">{formatTs(c.timestamp)}</span>
                  <button
                    onClick={() => onDeleteComment(note.id, c.id)}
                    className="ml-auto text-gray-300 hover:text-red-400 opacity-0 group-hover/comment:opacity-100 transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-2.5 leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-amber-100">
          <input
            value={commentAuthor}
            onChange={e => setCommentAuthor(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAddComment()}
              placeholder="나눔, 질문, 묵상을 댓글로 남겨보세요…"
              className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim() || !commentAuthor.trim() || sendingComment}
              className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800 disabled:opacity-40 transition-colors"
            >
              {sendingComment ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 9. NoteEditor (설교자 필드 제거)
// ──────────────────────────────────────────────────────────

function NoteEditor({ initialNote, onSave, onCancel, onOpenBible, pendingVerse, onVerseClear, saving }) {
  const isEdit = !!initialNote?.id;
  const blank = {
    title: "", date: new Date().toISOString().slice(0, 10),
    church: "", mainScripture: "",
    content: "", summary: "", tags: [], verses: [], isPublic: true
  };
  const [form, setForm] = useState(initialNote ? { ...initialNote } : blank);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (pendingVerse) {
      setForm(f => ({ ...f, verses: [...(f.verses || []), pendingVerse] }));
      onVerseClear();
    }
  }, [pendingVerse]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !(form.tags || []).includes(t)) set("tags", [...(form.tags || []), t]);
    setTagInput("");
  };

  const handleSave = () => {
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    onSave(form);
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">
          {isEdit ? "📝 노트 수정" : "✨ 새 성경공부 노트"}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-5">
        {/* 제목 */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">제목 *</label>
          <input
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder="설교 제목 또는 성경공부 주제"
            className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* 날짜 & 본문구절 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">날짜</label>
            <input
              type="date" value={form.date}
              onChange={e => set("date", e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">본문 성경구절</label>
            <input
              value={form.mainScripture}
              onChange={e => set("mainScripture", e.target.value)}
              placeholder="요한복음 3:16"
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* 교회 */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">교회 (선택)</label>
          <input
            value={form.church}
            onChange={e => set("church", e.target.value)}
            placeholder="교회 이름"
            className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* 노트 내용 */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">노트 내용</label>
          <textarea
            value={form.content}
            onChange={e => set("content", e.target.value)}
            placeholder="설교 내용, 묵상, 적용점, 기도 제목 등을 자유롭게 작성하세요…"
            rows={10}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-400 leading-7"
          />
        </div>

        {/* 요약 */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
            요약 <span className="font-normal text-gray-400">(다른 사람들이 보게 될 핵심 요약)</span>
          </label>
          <textarea
            value={form.summary}
            onChange={e => set("summary", e.target.value)}
            placeholder="이 노트의 핵심을 2~3문장으로 요약하세요."
            rows={3}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* 인용 구절 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">인용 성경 구절</label>
            <button
              onClick={onOpenBible}
              className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-200 font-semibold transition-colors"
            >
              <BookOpen size={12} /> 구절 검색 · 추가
            </button>
          </div>
          {(form.verses || []).length === 0 ? (
            <div
              onClick={onOpenBible}
              className="border-2 border-dashed border-amber-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all"
            >
              <BookOpen size={24} className="mx-auto text-amber-300 mb-1" />
              <p className="text-xs text-gray-400">클릭하여 성경 구절을 추가하세요</p>
            </div>
          ) : (
            (form.verses || []).map(v => (
              <VerseCard key={v.id} verse={v} onDelete={() => set("verses", form.verses.filter(x => x.id !== v.id))} />
            ))
          )}
        </div>

        {/* 태그 */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">태그</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(form.tags || []).map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
                #{tag}
                <button onClick={() => set("tags", form.tags.filter(t => t !== tag))} className="text-amber-400 hover:text-red-400 ml-0.5">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="태그 입력 후 Enter (예: 사랑, 믿음)"
              className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button onClick={addTag} className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors">
              추가
            </button>
          </div>
        </div>

        {/* 공개 설정 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-700">공개 노트</p>
            <p className="text-xs text-gray-400 mt-0.5">다른 사람들이 이 노트를 보고 댓글을 달 수 있습니다</p>
          </div>
          <button
            onClick={() => set("isPublic", !form.isPublic)}
            className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${form.isPublic ? "bg-amber-500" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.isPublic ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* 저장/취소 */}
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-amber-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-amber-900 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader size={15} className="animate-spin" /> 저장 중…</> : (isEdit ? "✅ 수정 완료" : "✅ 노트 저장")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 10. HomeView
// ──────────────────────────────────────────────────────────

function HomeView({ notes, onSelect, onNew, searchQuery, setSearchQuery, filterTag, setFilterTag, loading, serverError, onRetry }) {
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];
  const filtered = notes.filter(n => {
    const q = searchQuery.toLowerCase();
    const ok = !q ||
      n.title.toLowerCase().includes(q) ||
      n.summary?.toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q)) ||
      n.mainScripture?.toLowerCase().includes(q) ||
      n.church?.toLowerCase().includes(q);
    const tagOk = !filterTag || (n.tags || []).includes(filterTag);
    return ok && tagOk;
  });

  return (
    <div>
      {serverError && <ServerErrorBanner onRetry={onRetry} />}

      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="제목, 태그, 성경구절로 검색…"
            className="w-full border border-amber-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button
          onClick={onNew}
          className="bg-amber-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-900 flex items-center gap-2 whitespace-nowrap transition-colors shadow-sm"
        >
          <Plus size={16} /> 새 노트
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterTag("")}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${!filterTag ? "bg-amber-800 text-white" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"}`}
          >
            전체 ({notes.length})
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${filterTag === tag ? "bg-amber-700 text-white" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader size={36} className="animate-spin opacity-40" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={52} className="mx-auto mb-3 opacity-20" />
          <p className="text-lg font-semibold text-gray-500 mb-1">노트가 없습니다</p>
          <p className="text-sm">새 노트를 만들어 성경공부를 시작해보세요!</p>
          <button onClick={onNew} className="mt-4 inline-flex items-center gap-2 bg-amber-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-800 transition-colors">
            <Plus size={15} /> 첫 노트 작성하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map(note => (
            <NoteCard key={note.id} note={note} onClick={() => onSelect(note.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 11. Main App
// ──────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("home");
  const [notes, setNotes] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showBible, setShowBible] = useState(false);
  const [pendingVerse, setPendingVerse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── 초기 데이터 로딩 ──
  const loadNotes = async () => {
    setLoading(true);
    setServerError(false);
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch {
      setServerError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotes(); }, []);

  const currentNote = notes.find(n => n.id === currentNoteId);
  const goHome = () => { setView("home"); setCurrentNoteId(null); };

  // ── 노트 선택 (조회수는 백엔드에서 처리) ──
  const handleSelectNote = async (id) => {
    try {
      const note = await api.getNotes(); // 간단히 전체 재로드
      setNotes(note);
    } catch {}
    setCurrentNoteId(id);
    setView("detail");
  };

  // ── 저장 ──
  const handleSaveNote = async (form) => {
    setSaving(true);
    try {
      if (editingNote?.id) {
        const updated = await api.updateNote(editingNote.id, form);
        setNotes(ns => ns.map(n => n.id === editingNote.id ? updated : n));
        setCurrentNoteId(editingNote.id);
      } else {
        const newNote = await api.createNote(form);
        setNotes(ns => [newNote, ...ns]);
        setCurrentNoteId(newNote.id);
      }
      setEditingNote(null);
      setView("detail");
    } catch {
      alert("저장에 실패했습니다. 서버 연결을 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  // ── 삭제 ──
  const handleDeleteNote = async (id) => {
    try {
      await api.deleteNote(id);
      setNotes(ns => ns.filter(n => n.id !== id));
      goHome();
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  // ── 좋아요 ──
  const handleLike = async (id) => {
    try {
      const { likes } = await api.likeNote(id);
      setNotes(ns => ns.map(n => n.id === id ? { ...n, likes } : n));
    } catch {}
  };

  // ── 댓글 추가 ──
  const handleAddComment = async (noteId, commentData) => {
    const comment = await api.addComment(noteId, commentData);
    setNotes(ns => ns.map(n =>
      n.id === noteId ? { ...n, comments: [...(n.comments || []), comment] } : n
    ));
  };

  // ── 댓글 삭제 ──
  const handleDeleteComment = async (noteId, commentId) => {
    try {
      await api.deleteComment(noteId, commentId);
      setNotes(ns => ns.map(n =>
        n.id === noteId ? { ...n, comments: n.comments.filter(c => c.id !== commentId) } : n
      ));
    } catch {}
  };

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#fffbf5" }}>
      {/* ── Header ── */}
      <header style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)" }} className="text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <button onClick={goHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
          <div className="bg-white bg-opacity-20 p-2 rounded-xl">
            <BookOpen size={22} className="text-amber-100" />
          </div>
          <div>
            <h1 className="font-black text-lg leading-none tracking-tight">말씀 노트</h1>
            <p className="text-amber-300 text-xs mt-0.5 font-medium">Bible Study Notes</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {/* 서버 상태 표시 */}
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${serverError ? "bg-red-500 bg-opacity-30 text-red-200" : "bg-green-500 bg-opacity-30 text-green-200"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${serverError ? "bg-red-400" : "bg-green-400"}`} />
            {serverError ? "서버 오프라인" : "서버 연결됨"}
          </div>

          {view !== "home" && (
            <button onClick={goHome} className="text-amber-300 hover:text-white text-sm flex items-center gap-1 transition-colors">
              <Home size={15} /> 홈
            </button>
          )}
          {view === "home" && (
            <button
              onClick={() => { setEditingNote(null); setView("edit"); }}
              className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              <Plus size={16} /> 새 노트 작성
            </button>
          )}
        </div>
      </header>

      {/* ── Stats bar ── */}
      {view === "home" && (
        <div style={{ background: "#7c2d12" }} className="text-white px-6 py-2 flex gap-6 text-xs opacity-90">
          <span>📚 전체 {notes.length}개</span>
          <span>🌐 공개 {notes.filter(n => n.isPublic).length}개</span>
          <span>💬 댓글 {notes.reduce((a, n) => a + (n.comments || []).length, 0)}개</span>
          <span>❤️ 좋아요 {notes.reduce((a, n) => a + (n.likes || 0), 0)}개</span>
        </div>
      )}

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === "home" && (
          <HomeView
            notes={notes}
            onSelect={handleSelectNote}
            onNew={() => { setEditingNote(null); setView("edit"); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            loading={loading}
            serverError={serverError}
            onRetry={loadNotes}
          />
        )}
        {view === "detail" && currentNote && (
          <NoteDetail
            note={currentNote}
            onBack={goHome}
            onEdit={() => { setEditingNote(currentNote); setView("edit"); }}
            onDelete={handleDeleteNote}
            onLike={handleLike}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        )}
        {view === "edit" && (
          <NoteEditor
            initialNote={editingNote}
            onSave={handleSaveNote}
            onCancel={() => setView(editingNote?.id ? "detail" : "home")}
            onOpenBible={() => setShowBible(true)}
            pendingVerse={pendingVerse}
            onVerseClear={() => setPendingVerse(null)}
            saving={saving}
          />
        )}
      </main>

      {/* ── Bible Panel ── */}
      {showBible && (
        <BiblePanel
          onClose={() => setShowBible(false)}
          onInsert={v => { setPendingVerse(v); setShowBible(false); }}
        />
      )}
    </div>
  );
}
