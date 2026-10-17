import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QUESTIONS, SUBJECTS } from '../lib/content';
import { isDue, orderForReview, scheduleReview } from '../lib/flashcards';
import { uid, useStore } from '../lib/store';
import { Card, Empty, PageHeader } from '../components/ui';
import type { CustomDeck } from '../lib/types';

interface BankCard { id: string; front: string; back: string; subject: string; }

function bankCards(subject: string | null): BankCard[] {
  return QUESTIONS
    .filter((q) => (!subject || q.subject === subject) && (q.type === 'mcq' || q.type === 'short' || q.type === 'fill_blank' || q.type === 'true_false'))
    .map((q) => ({
      id: `q-${q.id}`,
      front: q.question,
      back: q.type === 'mcq' ? String(q.answer) : q.type === 'true_false' ? (q.answer ? 'True' : 'False') : String([q.answer].flat()[0]),
      subject: q.subject,
    }));
}

export default function FlashcardsPage() {
  const { store, recordFlashReview, addActivity, upsertDeck, removeDeck } = useStore();
  const [params] = useSearchParams();
  const [subject, setSubject] = useState(params.get('subject') ?? '');
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'bank' | 'custom'>('bank');
  const [deckId, setDeckId] = useState<string>('');
  const [newDeckName, setNewDeckName] = useState('');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [importJson, setImportJson] = useState('');
  const [msg, setMsg] = useState('');

  const cards = useMemo(() => {
    if (mode === 'custom') {
      const deck = store.decks.find((d) => d.id === deckId);
      return (deck?.cards ?? []).map((c) => ({ id: `c-${c.id}`, front: c.front, back: c.back, subject: deck?.subject ?? '' }));
    }
    return bankCards(subject || null);
  }, [mode, deckId, store.decks, subject]);

  const [flipped, setFlipped] = useState(false);
  const orderedIds = useMemo(() => orderForReview(cards.map((c) => c.id), store.flash), [cards, store.flash]);
  // reset flip state whenever the card changes
  useEffect(() => { setFlipped(false); }, [orderedIds[Math.min(index, orderedIds.length - 1)]]);
  const dueCount = orderedIds.filter((id) => isDue(store.flash[id] ?? null)).length;
  const card = cards.find((c) => c.id === orderedIds[Math.min(index, orderedIds.length - 1)]);

  const review = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!card) return;
    const prev = store.flash[card.id] ?? null;
    recordFlashReview(card.id, scheduleReview(prev, quality));
    if (index + 1 >= orderedIds.length) {
      addActivity({ kind: 'flashcards', subjectId: subject || null, detail: `Flashcards (${orderedIds.length} cards)`, xp: 15, correct: orderedIds.length, total: orderedIds.length, eventKey: `flash-${Date.now()}` });
      setIndex(0);
    } else setIndex(index + 1);
    setFlipped(false);
  };

  const reviewRef = useRef(review);
  reviewRef.current = review;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { setIndex((i) => Math.min(orderedIdsRef.current.length - 1, i + 1)); setFlipped(false); }
      else if (e.key === 'ArrowLeft') { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === '1') reviewRef.current(1);
      else if (e.key === '2') reviewRef.current(3);
      else if (e.key === '3') reviewRef.current(4);
      else if (e.key === '4') reviewRef.current(5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const orderedIdsRef = useRef(orderedIds);
  orderedIdsRef.current = orderedIds;

  const createDeck = () => {
    if (!newDeckName.trim()) return;
    const deck: CustomDeck = { id: uid(), name: newDeckName.trim(), subject: subject || 'general', cards: [], createdAt: Date.now() };
    upsertDeck(deck);
    setDeckId(deck.id);
    setMode('custom');
    setNewDeckName('');
  };

  const addCard = () => {
    const deck = store.decks.find((d) => d.id === deckId);
    if (!deck || !newFront.trim() || !newBack.trim()) return;
    upsertDeck({ ...deck, cards: [...deck.cards, { id: uid(), front: newFront.trim(), back: newBack.trim() }] });
    setNewFront('');
    setNewBack('');
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importJson) as { name?: string; subject?: string; cards?: { front: string; back: string }[] };
      if (!parsed || !Array.isArray(parsed.cards)) throw new Error('bad');
      const valid = parsed.cards.filter((c) => typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim());
      if (valid.length === 0) throw new Error('empty');
      const deck: CustomDeck = {
        id: uid(), name: String(parsed.name ?? 'Imported deck').slice(0, 60), subject: String(parsed.subject ?? 'general'),
        cards: valid.slice(0, 200).map((c) => ({ id: uid(), front: c.front.trim(), back: c.back.trim() })), createdAt: Date.now(),
      };
      upsertDeck(deck);
      setDeckId(deck.id);
      setMode('custom');
      setImportJson('');
      setMsg(`Imported ${deck.cards.length} cards.`);
    } catch {
      setMsg('Import failed — expected {"name","subject","cards":[{"front","back"}]}.');
    }
  };

  return (
    <div>
      <PageHeader title="Flashcards" sub="Flip, self-rate, and let spaced repetition schedule reviews. Opening a card never counts as mastered — only honest reviews move cards." />
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={mode === 'bank' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setMode('bank')}>Question bank ({bankCards(subject || null).length})</button>
          <button className={mode === 'custom' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setMode('custom')}>My decks ({store.decks.length})</button>
          <select className="select" style={{ width: 'auto' }} value={subject} onChange={(e) => { setSubject(e.target.value); setIndex(0); }} aria-label="Filter by subject">
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="badge">{dueCount} due for review</span>
        </div>
      </Card>

      {mode === 'custom' && (
        <Card style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>My decks</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <input className="input" style={{ maxWidth: 220 }} placeholder="New deck name" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} />
            <button className="btn btn-ghost" onClick={createDeck}>Create deck</button>
            <select className="select" style={{ width: 'auto' }} value={deckId} onChange={(e) => setDeckId(e.target.value)} aria-label="Choose deck">
              <option value="">Choose a deck…</option>
              {store.decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>)}
            </select>
            {deckId && <button className="btn btn-danger" onClick={() => { removeDeck(deckId); setDeckId(''); }}>Delete deck</button>}
          </div>
          {deckId && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 220 }} placeholder="Front" value={newFront} onChange={(e) => setNewFront(e.target.value)} />
              <input className="input" style={{ maxWidth: 220 }} placeholder="Back" value={newBack} onChange={(e) => setNewBack(e.target.value)} />
              <button className="btn btn-ghost" onClick={addCard}>Add card</button>
              <button className="btn btn-ghost" onClick={() => {
                const deck = store.decks.find((d) => d.id === deckId);
                if (!deck) return;
                navigator.clipboard?.writeText(JSON.stringify({ name: deck.name, subject: deck.subject, cards: deck.cards.map((c) => ({ front: c.front, back: c.back })) }, null, 2)).catch(() => {});
                setMsg('Deck JSON copied to clipboard.');
              }}>Export deck</button>
            </div>
          )}
          <details style={{ marginTop: 10 }}>
            <summary>Import deck JSON</summary>
            <textarea className="textarea" rows={3} placeholder='{"name":"...","subject":"...","cards":[{"front":"...","back":"..."}]}' value={importJson} onChange={(e) => setImportJson(e.target.value)} />
            <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={doImport}>Import</button>
          </details>
          {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
        </Card>
      )}

      {!card && <Empty title="No cards" body="Pick a subject with questions or create your own deck above." />}
      {card && (
        <div key={card.id} style={{ maxWidth: 560 }}>
          <div className="flashcard-3d">
            <button
              onClick={() => setFlipped(!flipped)}
              aria-label={flipped ? 'Show front' : 'Show back'}
              style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', padding: 0, height: '100%' }}
            >
              <div className={`flashcard-inner${flipped ? ' flipped' : ''}`}>
                <div className="flashcard-face">
                  {card.front}<br />
                  <small style={{ color: 'var(--muted)', display: 'block', marginTop: 8 }}>
                    (tap to flip · ←/→ to move · 1-4 to rate)
                  </small>
                </div>
                <div className="flashcard-back">{card.back}</div>
              </div>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }} role="group" aria-label="Rate recall">
            <button className="btn btn-ghost" onClick={() => review(1)}>😞 Forgot (1)</button>
            <button className="btn btn-ghost" onClick={() => review(3)}>😐 Hard (2)</button>
            <button className="btn btn-ghost" onClick={() => review(4)}>🙂 Got it (3)</button>
            <button className="btn btn-ghost" onClick={() => review(5)}>😎 Easy (4)</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped(false); }}>← Prev</button>
            <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>{Math.min(index + 1, orderedIds.length)} / {orderedIds.length}</span>
            <button className="btn btn-ghost" onClick={() => { setIndex(Math.min(orderedIds.length - 1, index + 1)); setFlipped(false); }}>Next →</button>
            <button className="btn btn-ghost" onClick={() => setIndex(0)}>🔀 Due first</button>
          </div>
        </div>
      )}
    </div>
  );
}
