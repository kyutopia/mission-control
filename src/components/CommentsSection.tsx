'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

export function CommentsSection({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then(r => r.json())
      .then(setComments)
      .finally(() => setLoading(false));
  }, [taskId]);

  const addComment = async () => {
    if (!author.trim() || !content.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: author.trim(), content: content.trim() }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments([...comments, comment]);
      setContent('');
    }
  };

  if (loading) return <div className="text-xs text-mc-text-secondary">로딩중...</div>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        코멘트
        {comments.length > 0 && (
          <span className="text-xs text-mc-text-secondary">({comments.length})</span>
        )}
      </h3>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-xs text-mc-text-secondary">아직 코멘트가 없습니다.</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="bg-mc-bg-tertiary/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{c.author}</span>
              <span className="text-[10px] text-mc-text-secondary">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
              </span>
            </div>
            <p className="text-sm text-mc-text-secondary whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-mc-border pt-3">
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="작성자"
          className="w-full bg-mc-bg border border-mc-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-mc-accent"
        />
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addComment(); }}
            placeholder="코멘트 작성... (⌘+Enter로 전송)"
            rows={2}
            className="flex-1 bg-mc-bg border border-mc-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-mc-accent resize-none"
          />
          <button
            onClick={addComment}
            disabled={!author.trim() || !content.trim()}
            className="px-3 self-end bg-mc-accent text-white rounded text-sm hover:bg-mc-accent/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
