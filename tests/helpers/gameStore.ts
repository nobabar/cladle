/**
 * Test helper for the game store.
 *
 * We use Pinia's "Mocking the returned value of an action" pattern: a
 * generic mockedStore() that reconstructs the store type (with actions as
 * Mock when applicable). getGameStore() uses it at runtime. In our test
 * context useGameStore() is inferred as Store<"game", GameState, {}, {}>,
 * so the conditional type still yields empty getters/actions; we therefore
 * type getGameStore()'s return as a loose type so tests type-check. When
 * inference is fixed (or for other stores), mockedStore gives full types.
 *
 * @see https://pinia.vuejs.org/cookbook/testing.html#mocking-the-returned-value-of-an-action
 */

import type { Mock } from "vitest";
import type { Store, StoreDefinition } from "pinia";
import { useGameStore } from "~/stores/gameStore";

/**
 * Generic helper from Pinia testing docs: takes a store definition and
 * returns the store instance typed so that actions are Mock<Action> (for
 * .mockResolvedValue(), .toHaveBeenCalledWith(), etc.) while state and
 * getters stay correctly typed.
 *
 * @param useStore - Store definition (e.g. useXStore)
 * @returns Store instance with actions typed as Mock when applicable
 */
function mockedStore<TStoreDef extends () => unknown>(
  useStore: TStoreDef,
): TStoreDef extends StoreDefinition<infer Id, infer State, infer Getters, infer Actions>
  ? Store<
    Id,
    State,
    Getters,
    {
      [K in keyof Actions]: Actions[K] extends (...args: any[]) => any
        ? Mock<Actions[K]>
        : Actions[K];
    }
  >
  : ReturnType<TStoreDef> {
  return useStore() as any;
}

/**
 * Returns the game store for use in tests. Uses mockedStore(useGameStore) at
 * runtime. Return type is `any` so tests type-check despite useGameStore being
 * inferred as Store<"game", GameState, {}, {}> in this context; when inference
 * is fixed, you can switch to ReturnType<typeof mockedStore<typeof useGameStore>>.
 *
 * @returns Game store instance (typed as any until store inference is fixed)
 */
export function getGameStore(): any {
  return mockedStore(useGameStore);
}
