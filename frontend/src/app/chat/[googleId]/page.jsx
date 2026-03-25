'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  formatTime,
  getErrorMessage,
  listChatMessages,
  openDirectChat,
  requestJson,
  sendChatMessage
} from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

export default function DirectChatPage() {
  const params = useParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function initChat() {
      try {
        const targetGoogleId = String(params?.googleId || '').trim();

        if (!targetGoogleId) {
          throw new Error('Invalid target user id.');
        }

        const sessionPayload = await requestJson('/api/sessions/current');
        const me = sessionPayload.user || null;

        if (!me) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }

        if (me.googleId === targetGoogleId) {
          throw new Error('You cannot open a direct chat with yourself.');
        }

        const openedChat = await openDirectChat(targetGoogleId);
        const payload = await listChatMessages(openedChat.id, 200);

        if (!ignore) {
          setCurrentUser(me);
          setChat(openedChat);
          setMessages(payload.messages || []);
          setStatus('');
        }
      } catch (error) {
        if (!ignore) {
          setStatus(getErrorMessage(error, 'Failed to initialize chat.'));
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    initChat();

    return () => {
      ignore = true;
    };
  }, [params?.googleId, router]);

  useEffect(() => {
    if (!chat?.id) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRefreshTick((previous) => previous + 1);
    }, 3000);

    return () => clearInterval(timer);
  }, [chat?.id]);

  useEffect(() => {
    let cancelled = false;

    async function refreshMessages() {
      if (!chat?.id) {
        return;
      }

      try {
        const payload = await listChatMessages(chat.id, 200);

        if (!cancelled) {
          setMessages(payload.messages || []);
        }
      } catch {
        // no-op
      }
    }

    refreshMessages();

    return () => {
      cancelled = true;
    };
  }, [chat?.id, refreshTick]);

  async function handleSend() {
    if (!chat?.id || sending) {
      return;
    }

    const content = String(draft || '').trim();

    if (!content) {
      return;
    }

    try {
      setSending(true);
      setStatus('');
      const created = await sendChatMessage(chat.id, content);
      setMessages((previous) => [...previous, created]);
      setDraft('');
    } catch (error) {
      setStatus(getErrorMessage(error, 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  }

  const peerLabel = useMemo(() => {
    if (!chat?.peer) {
      return String(params?.googleId || '').trim();
    }

    return chat.peer.name || chat.peer.email || chat.peer.googleId;
  }, [chat?.peer, params?.googleId]);

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Opening chat...
        </div>
      </section>
    );
  }

  if (status && !chat) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {status}
        </div>
      </section>
    );
  }

  return (
    <section className="app-container py-8 sm:py-10">
      <article className="mx-auto w-full max-w-4xl rounded-2xl border border-clicon-border bg-white p-5 shadow-card sm:p-6">
        <PageHero
          iconSrc="/clicon/image/svg/mail.svg"
          title={`Chat with ${peerLabel}`}
          subtitle="Direct 1-1 conversation"
          actions={[
            { href: `/social-profile/${encodeURIComponent(String(params?.googleId || ''))}`, label: 'View Profile' },
            { href: '/social-profile', label: 'Back' }
          ]}
        />

        <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border border-clicon-border bg-clicon-surface p-3">
          {messages.length === 0 ? (
            <div className="rounded-lg bg-white p-3 text-sm text-clicon-muted">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((message) => {
              const isMine = currentUser?.googleId && message.senderGoogleId === currentUser.googleId;

              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      isMine ? 'bg-clicon-primary text-white' : 'bg-white text-clicon-slate'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`mt-1 text-[11px] ${isMine ? 'text-white/80' : 'text-clicon-muted'}`}>
                      {formatTime(message.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type message..."
            className="min-h-[48px] flex-1 rounded-xl border border-clicon-border px-3 py-2 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !String(draft || '').trim()}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-clicon-primary px-5 text-sm font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {status ? <p className="mt-3 text-sm text-red-700">{status}</p> : null}
      </article>
    </section>
  );
}
