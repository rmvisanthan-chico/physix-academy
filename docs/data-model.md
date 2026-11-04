# Data Model

> PhysiX Academy — Store schema and data structures. Last verified: 2026-11-03.

## Store (js/utils.js)

Local-first persistence: localStorage key `physix.v1` (mirror) + IndexedDB `kv` (primary).

```
Store.data = {
  settings: { theme, fontSize, contrast, accent },
  completed: { [lessonId]: timestamp },
  quiz: {
    history: [{ qid, topic, difficulty, correct, t, given? }],  // cap 1000
    perTopic: { [topic]: { correct, total } }
  },
  solved: number,
  streakDays: ["2026-11-01", ...],
  timeLog: { "2026-11-01": seconds },
  lastLesson: lessonId | null,
  notes: { [lessonId]: string },
  sims: { [simId]: { opens, ms } },        // lazily added
  lab: { [simId]: { observations, measurements } }  // lazily added
}
```

## Quiz Bank (js/data-quiz-a/b/c.js)

```
{ id, topic, difficulty, q, choices: [4], answer: index, why }
```

- 87 questions total
- difficulty: `beginner | intermediate | advanced | expert`
- topics include: vectors, math, kinematics, newton, friction, energy, momentum, gravity, heat, waves, electricity, magnetism, light, units, projectile, com, rotation, solids, fluids, thermal, thermo, kinetic, shm, sound, charges, potential, current, magforce, em-induction, ac, optics, waveoptics, modern, atoms, nucleus, semiconductor, relativity, quantum

## Curriculum (js/data-core.js, js/data-ncert*.js)

```
CURRICULUM = [
  { id: 'l1', name, tag, icon, color, desc, chapters: [
    { id: 'l1.what', title, icon, tagline, mins, lessons: [
      { id: 'l1.what.intro', title, mins, content: [blocks] }
    ]}
  ]}
]
```

Content block types: `h | p | why | intuition | def | formula(s) | derive | example | mistakes | revise | sim | svg | table | quiz | ul`

## Knowledge Graph (js/graph.js)

```
KG_EDGES = [ ['l1.what', 'l1.units'], ... ]  // 53 prerequisite edges
```

## Phase 4A proposed schemas (not yet implemented)

### Personalized Path (Store.data.path)

```
{
  version: 2,
  planId: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  inputsHash: string,
  steps: [{ lessonId, kind: 'learn'|'review', reason, priority, minutes, status }]
}
```

### Achievements (Store.data.achievements)

```
{
  version: 2,
  xp: number,
  level: number,
  unlocked: { [achievementId]: timestamp },
  counters: { [key]: number },
  processedEvents: [string]  // idempotency keys
}
```

### Adaptive Assessment (Store.data.assessment)

```
{
  version: 1,
  ability: { [topic]: { theta, answered, updatedAt } },
  sessions: [{ id, startedAt, endedAt, targetTopic, items, responses, abilityBefore, abilityAfter, diagnosis }]
}
```
