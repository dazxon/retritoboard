import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

// Lo unico que protege los datos es firestore.rules (el link de la sala es la
// unica barrera), asi que cada permiso del modelo tiene su caso aca.

let env: RulesTestEnvironment

const ADMIN = 'admin'
const AUTOR = 'autor'
const OTRO = 'otro'

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-retritoboard',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'rooms/r1'), {
      name: 'Retro',
      createdBy: ADMIN,
      revealed: false,
      columns: [],
    })
    await setDoc(doc(db, 'rooms/r1/cards/c1'), {
      columnId: 'bien',
      authorUid: AUTOR,
      authorName: 'Autor',
      content: 'hola',
      order: 1000,
      reactions: { like: [OTRO] },
      reactionsBy: { [OTRO]: { '🔥': 1 } },
    })
    await setDoc(doc(db, 'rooms/r1/users', AUTOR), { name: 'Autor' })
  })
})

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()

describe('rooms', () => {
  it('cualquier usuario autenticado lee; sin auth no', async () => {
    await assertSucceeds(getDoc(doc(as(OTRO), 'rooms/r1')))
    await assertFails(getDoc(doc(anon(), 'rooms/r1')))
  })

  it('crear: solo con createdBy igual a uno mismo', async () => {
    await assertSucceeds(setDoc(doc(as(OTRO), 'rooms/r2'), { createdBy: OTRO, name: 'x' }))
    await assertFails(setDoc(doc(as(OTRO), 'rooms/r3'), { createdBy: ADMIN, name: 'x' }))
    await assertFails(setDoc(doc(anon(), 'rooms/r4'), { createdBy: 'nadie', name: 'x' }))
  })

  it('solo el admin modifica la sala (revelar, columnas, votacion, presentacion)', async () => {
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'rooms/r1'), { revealed: true }))
    await assertSucceeds(
      updateDoc(doc(as(ADMIN), 'rooms/r1'), {
        voting: { state: 'open', round: 'abc', votesPerPerson: 5, maxPerCard: 3 },
      }),
    )
    const presentation = { order: [AUTOR, ADMIN], current: AUTOR, done: [] }
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'rooms/r1'), { presentation }))
    await assertFails(
      updateDoc(doc(as(AUTOR), 'rooms/r1'), {
        presentation: { ...presentation, done: [AUTOR] },
      }),
    )
    await assertFails(updateDoc(doc(as(OTRO), 'rooms/r1'), { revealed: true }))
    await assertFails(updateDoc(doc(as(OTRO), 'rooms/r1'), { createdBy: OTRO }))
  })

  it('nadie borra salas', async () => {
    await assertFails(deleteDoc(doc(as(ADMIN), 'rooms/r1')))
  })
})

describe('cards', () => {
  const card = (uid: string) => ({
    columnId: 'bien',
    authorUid: uid,
    authorName: 'X',
    content: 'nueva',
    order: 2000,
  })

  it('crear: solo como autor propio', async () => {
    await assertSucceeds(addDoc(collection(as(OTRO), 'rooms/r1/cards'), card(OTRO)))
    await assertFails(addDoc(collection(as(OTRO), 'rooms/r1/cards'), card(AUTOR)))
  })

  it('editar y borrar: el autor o el admin, nadie mas', async () => {
    await assertSucceeds(updateDoc(doc(as(AUTOR), 'rooms/r1/cards/c1'), { content: 'editada' }))
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'rooms/r1/cards/c1'), { order: 500 }))
    await assertFails(updateDoc(doc(as(OTRO), 'rooms/r1/cards/c1'), { content: 'hackeada' }))
    await assertFails(deleteDoc(doc(as(OTRO), 'rooms/r1/cards/c1')))
    await assertSucceeds(deleteDoc(doc(as(ADMIN), 'rooms/r1/cards/c1')))
  })

  it('soft-delete del autor', async () => {
    await assertSucceeds(
      updateDoc(doc(as(AUTOR), 'rooms/r1/cards/c1'), { deleted: true, deletedBy: AUTOR }),
    )
  })

  describe('reacciones', () => {
    const ref = (uid: string) => doc(as(uid), 'rooms/r1/cards/c1')
    const mine = (uid: string, emoji: string) => new FieldPath('reactionsBy', uid, emoji)

    // Ni autor ni admin: esos pueden tocar toda la tarjeta por la otra regla
    const T = 'tercero'

    it('cualquiera pone y saca emojis en su propio mapa, los que quiera', async () => {
      await assertSucceeds(updateDoc(ref(T), mine(T, '🦄'), 1))
      await assertSucceeds(updateDoc(ref(T), mine(T, '🔥'), 2))
      await assertSucceeds(updateDoc(ref(T), mine(T, '👨‍👩‍👧'), 3))
      await assertSucceeds(updateDoc(ref(OTRO), mine(OTRO, '🔥'), deleteField()))
    })

    it('no puede tocar el mapa de otro', async () => {
      await assertFails(updateDoc(ref(T), mine(OTRO, '🔥'), deleteField()))
      await assertFails(updateDoc(ref(T), mine(OTRO, '💩'), 1))
      await assertFails(updateDoc(ref(T), mine(T, '🎉'), 1, mine(OTRO, '🎉'), 1))
      await assertFails(updateDoc(ref(T), { reactionsBy: {} }))
    })

    it('tiene un tope de emojis por persona', async () => {
      const muchos = (n: number) =>
        Object.fromEntries(
          Array.from({ length: n }, (_, i) => [String.fromCodePoint(0x1f600 + i), i]),
        )
      await assertSucceeds(updateDoc(ref(T), new FieldPath('reactionsBy', T), muchos(50)))
      await assertFails(updateDoc(ref(T), new FieldPath('reactionsBy', T), muchos(51)))
    })

    it('formato viejo: saca su uid junto con la reacción nueva', async () => {
      await assertSucceeds(
        updateDoc(
          ref(OTRO),
          mine(OTRO, '👍'),
          deleteField(),
          new FieldPath('reactions', 'like'),
          arrayRemove(OTRO),
        ),
      )
    })

    it('formato viejo: cualquiera agrega o saca su propio uid', async () => {
      await assertSucceeds(updateDoc(ref(ADMIN), { reactions: { like: [OTRO, ADMIN] } }))
      await assertSucceeds(updateDoc(ref(OTRO), { reactions: { like: [ADMIN] } }))
      await assertSucceeds(
        updateDoc(ref(OTRO), { reactions: { like: [ADMIN], rocket: [OTRO] } }),
      )
    })

    it('formato viejo: no puede agregar ni sacar el uid de otro', async () => {
      const tercero = 'tercero'
      await assertFails(updateDoc(ref(tercero), { reactions: { like: [OTRO, AUTOR] } }))
      await assertFails(updateDoc(ref(tercero), { reactions: { like: [] } }))
    })

    it('formato viejo: no acepta keys fuera del set', async () => {
      await assertFails(updateDoc(ref(OTRO), { reactions: { like: [OTRO], caca: [OTRO] } }))
    })

    it('reaccionar no habilita tocar otros campos', async () => {
      await assertFails(
        updateDoc(ref(OTRO), { reactions: { like: [] }, content: 'hackeada' }),
      )
      await assertFails(updateDoc(ref(OTRO), mine(OTRO, '🎉'), 1, 'content', 'hackeada'))
    })
  })
})

describe('users (presencia y votos)', () => {
  it('cada uno escribe solo su documento', async () => {
    await assertSucceeds(setDoc(doc(as(OTRO), 'rooms/r1/users', OTRO), { name: 'Otro' }))
    await assertSucceeds(
      updateDoc(doc(as(AUTOR), 'rooms/r1/users', AUTOR), {
        votes: { round: 'abc', byCard: { c1: 1 } },
      }),
    )
    await assertFails(
      updateDoc(doc(as(OTRO), 'rooms/r1/users', AUTOR), { name: 'Pisado' }),
    )
  })

  it('cualquiera autenticado lee la presencia', async () => {
    await assertSucceeds(getDoc(doc(as(OTRO), 'rooms/r1/users', AUTOR)))
    await assertFails(getDoc(doc(anon(), 'rooms/r1/users', AUTOR)))
  })
})

describe('feedback', () => {
  const fb = (uid: string, message: string) => ({ uid, message })

  it('crear con mensaje de 1 a 2000 caracteres y uid propio', async () => {
    await assertSucceeds(addDoc(collection(as(OTRO), 'feedback'), fb(OTRO, 'Muy buena')))
    await assertFails(addDoc(collection(as(OTRO), 'feedback'), fb(OTRO, '')))
    await assertFails(addDoc(collection(as(OTRO), 'feedback'), fb(OTRO, 'x'.repeat(2001))))
    await assertFails(addDoc(collection(as(OTRO), 'feedback'), fb(ADMIN, 'suplantado')))
  })

  it('nadie lo lee desde la app', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'feedback/f1'), fb(OTRO, 'hola'))
    })
    await assertFails(getDoc(doc(as(OTRO), 'feedback/f1')))
  })
})
