import type { Serializer } from "pinia-plugin-persistedstate";
import type { StateTree } from "pinia";
import type { TreeNode } from "~/types/tree";
import type { PersistedModeGameState } from "~/types/gamePersistence";
import {
  parsePersistedGameState,
  serializePersistedGameState,
} from "~/utils/gameStateSerialization";
import type { SerializePersistedGameStateInput } from "~/utils/gameStateSerialization";

const EMPTY_SLICE: SerializePersistedGameStateInput = {
  gameMode: null,
  dailyState: null,
  freePlayState: null,
};

/**
 * Map Pinia picked state (`gameMode`, `dailyState`, `freePlayState`) to serializer input.
 * Extra fields on mode snapshots (e.g. Maps) are ignored by `serializePersistedGameState`.
 * @param data - Picked store subtree from pinia-plugin-persistedstate.
 * @returns Input accepted by `serializePersistedGameState`.
 */
function toPersistInput(data: StateTree): SerializePersistedGameStateInput {
  const d = data as Record<string, unknown>;
  return {
    gameMode: (d.gameMode ?? null) as SerializePersistedGameStateInput["gameMode"],
    dailyState: (d.dailyState ?? null) as SerializePersistedGameStateInput["dailyState"],
    freePlayState: (d.freePlayState ?? null) as SerializePersistedGameStateInput["freePlayState"],
  };
}

/**
 * Pinia persisted-state serializer for `game` store: versioned JSON + safe parse.
 * Hydrated mode snapshots include empty Maps so `ModeGameState` shape matches the store.
 */
export const gameStorePersistSerializer: Serializer = {
  serialize(data: StateTree) {
    return serializePersistedGameState(toPersistInput(data));
  },
  deserialize(raw: string) {
    const parsed = parsePersistedGameState(raw);
    if (!parsed) {
      return { ...EMPTY_SLICE } as StateTree;
    }
    return {
      gameMode: parsed.gameMode,
      dailyState: parsed.dailyState
        ? withEmptyModeMaps(parsed.dailyState)
        : null,
      freePlayState: parsed.freePlayState
        ? withEmptyModeMaps(parsed.freePlayState)
        : null,
    } as StateTree;
  },
};

function withEmptyModeMaps(wire: PersistedModeGameState): PersistedModeGameState & {
  nodeMap: Map<string, TreeNode>;
  cladeMap: Map<string, TreeNode>;
} {
  return {
    ...wire,
    nodeMap: new Map(),
    cladeMap: new Map(),
  };
}
